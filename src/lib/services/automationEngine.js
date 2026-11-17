import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { getEmailProvider, providerName, ProviderNotConfiguredError } from "@/lib/email/provider";
import { appUrl, unsubscribeUrl } from "@/lib/email/render";
import { signToken } from "@/lib/email/tokens";
import { applyScoreEvent } from "./leadScoringService";
import { createNotification } from "./notificationService";
import { CONTACT_STATUSES } from "@/lib/constants/crm";
import { CONDITION_OPTIONS } from "@/lib/constants/automations";

const { Automation, AutomationNode, AutomationExecution, AutomationExecutionLog, Contact, Company, Department, Task, Activity, Conversation, Message, Registration } = db;

/**
 * Automation engine (IKL Sprint 3, MIR-1.8): trigger -> wait -> condition -> action workflows that run
 * by themselves.
 *
 *  - fireTrigger(type, contact, ctx)   called where things happen (contact created, form received,
 *                                      registration made, program completed, email opened, WhatsApp reply...)
 *                                      and enrols the person in every Active automation with that trigger
 *  - runDueAutomations()               called by the scheduler: wakes people whose "wait" is over
 *
 * Each person is in an automation once. Every step is written to the execution log. A person who
 * unsubscribed, bounced or opted out leaves the workflow.
 */

const MAX_STEPS = 40;
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fill(text, contact, companyName = "") {
  const v = { firstName: contact.firstName || "", lastName: contact.lastName || "", fullName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(), company: companyName || "" };
  return String(text || "").replace(/\{\{\s*(firstName|lastName|fullName|company)\s*\}\}/g, (_, k) => v[k]);
}

async function log(executionId, node, action, result = null) {
  await AutomationExecutionLog.create({ executionId, nodeId: node?.id || null, action: String(action).slice(0, 150), result: result ? String(result).slice(0, 250) : null, occurredAt: new Date() });
}

function childrenOf(nodes, parentId) {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order || a.id - b.id);
}

async function finish(automation, execution, status, converted = false) {
  await execution.update({ status, completedAt: new Date(), nextRunAt: null });
  await Automation.increment(
    { totalActive: -1, ...(status === "completed" ? { totalCompleted: 1 } : { totalExited: 1 }), ...(converted ? { totalConverted: 1 } : {}) },
    { where: { id: automation.id } }
  );
}

// ---------------------------------------------------------------- enrolling

export async function fireTrigger(triggerType, contact, ctx = {}) {
  try {
    if (!contact?.id) return;
    const automations = await Automation.findAll({ where: { departmentId: contact.departmentId, status: "Active", triggerType } });
    for (const automation of automations) {
      const cfg = automation.triggerConfig || {};
      if (cfg.programId && String(cfg.programId) !== String(ctx.programId)) continue;
      if (cfg.formType && cfg.formType !== ctx.formType) continue;
      if (await AutomationExecution.findOne({ where: { automationId: automation.id, contactId: contact.id }, attributes: ["id"] })) continue;
      const trigger = await AutomationNode.findOne({ where: { automationId: automation.id, type: "trigger" }, order: [["order", "ASC"]] });
      if (!trigger) continue;
      const execution = await AutomationExecution.create({ automationId: automation.id, contactId: contact.id, status: "active", currentNodeId: trigger.id, startedAt: new Date(), nextRunAt: new Date(), context: {} });
      await Automation.increment({ totalEntered: 1, totalActive: 1 }, { where: { id: automation.id } });
      await log(execution.id, trigger, "Entered automation");
      await advanceExecution(execution.id);
    }
  } catch (err) {
    // A failing automation must never break the action that started it (saving a contact, a form...).
    console.error(`[automation] trigger ${triggerType} failed:`, err?.message || err);
  }
}

// ----------------------------------------------------------------- running

async function evalCondition(node, execution, contact) {
  const ctx = execution.context || {};
  switch (node.key) {
    case "email_opened": return Boolean(ctx.lastEmail?.opened || ctx.lastEmail?.clicked);
    case "email_clicked": return Boolean(ctx.lastEmail?.clicked);
    case "whatsapp_reply": {
      const conversation = await Conversation.findOne({ where: { contactId: contact.id }, attributes: ["id"] });
      if (!conversation) return false;
      return (await Message.count({ where: { conversationId: conversation.id, direction: "inbound", sentAt: { [Op.gte]: execution.startedAt } } })) > 0;
    }
    case "is_registered": return (await Registration.count({ where: { contactId: contact.id, status: { [Op.ne]: "Cancelled" } } })) > 0;
    default: return false;
  }
}

function emailEligible(contact) {
  return Boolean(contact.email) && !contact.unsubscribedAt && !["Unsubscribed", "Bounced"].includes(contact.status) && contact.optIn !== "Opted Out";
}

async function sendAutomationEmail(automation, execution, contact, config, companyName) {
  if (!config?.subject || !config?.body) return { skipped: "This step has no email content yet." };
  if (!emailEligible(contact)) return { skipped: "The person cannot be emailed (no address, unsubscribed, bounced or opted out)." };
  const dept = await Department.findByPk(automation.departmentId);
  const base = appUrl();
  const unsub = unsubscribeUrl(0, contact.id);
  const bodyText = fill(config.body, contact, companyName);
  const paragraphs = escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")
    .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${base}/api/t/c/${signToken({ t: "c", a: execution.id, u: contact.id, url: url.replace(/&amp;/g, "&") })}">${url}</a>`);
  const pixel = `<img src="${base}/api/t/o/${signToken({ t: "o", a: execution.id, u: contact.id })}" width="1" height="1" alt="" style="display:none;border:0" />`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:600px">${paragraphs}<p style="font-size:12px;color:#6b7280;margin-top:24px">You receive this email from ${escapeHtml(dept?.senderName || dept?.name || "us")}. <a href="${unsub}" style="color:#6b7280">Unsubscribe</a></p>${pixel}</div>`;
  const text = `${bodyText}\n\nUnsubscribe: ${unsub}`;
  const provider = getEmailProvider(providerName());
  const result = await provider.send({
    to: contact.email, toName: `${contact.firstName} ${contact.lastName}`.trim(),
    from: dept?.senderEmail, fromName: dept?.senderName, replyTo: dept?.replyTo || dept?.senderEmail,
    subject: fill(config.subject, contact, companyName), html, text,
    headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    metadata: { automationId: automation.id, executionId: execution.id, contactId: contact.id },
  });
  if (!result?.ok) throw new Error(result?.error || "The email provider did not accept the message.");
  return { sent: true, subject: fill(config.subject, contact, companyName) };
}

async function runAction(node, automation, execution, contact) {
  const config = node.config || {};
  const companyName = contact.Company?.name || "";
  switch (node.key) {
    case "send_email": {
      const r = await sendAutomationEmail(automation, execution, contact, config, companyName);
      if (r.sent) {
        execution.context = { ...(execution.context || {}), lastEmail: { sentAt: new Date().toISOString(), opened: false, clicked: false } };
        await Activity.create({ type: "automation", title: `Automation email sent: ${r.subject}`, contactId: contact.id, occurredAt: new Date() });
        return "Email sent";
      }
      return `Skipped: ${r.skipped}`;
    }
    case "send_whatsapp": {
      if (!config.message) return "Skipped: this step has no message yet.";
      if (contact.optIn === "Opted Out" || contact.unsubscribedAt) return "Skipped: the person opted out.";
      const { sendWhatsappToContact } = await import("./whatsappService");
      const r = await sendWhatsappToContact(contact, config.message, { companyName });
      return r.ok ? "WhatsApp message sent" : `Skipped: ${r.error}`;
    }
    case "create_task": {
      const days = Math.max(0, Number(config.dueInDays) || 1);
      await Task.create({
        title: fill(config.title || "Follow up", contact, companyName).slice(0, 255), ownerId: contact.ownerId || null, contactId: contact.id,
        departmentId: contact.departmentId, dueDate: new Date(Date.now() + days * 86400000), priority: "Medium", status: "Pending",
      });
      return "Follow-up task created";
    }
    case "update_status": {
      if (!CONTACT_STATUSES.includes(config.status)) return "Skipped: no valid status chosen.";
      if (contact.status === "Converted") return "Skipped: already converted.";
      await contact.update({ status: config.status });
      return `Status set to ${config.status}`;
    }
    case "notify_owner": {
      if (!contact.ownerId) return "Skipped: the person has no owner.";
      await createNotification({ userId: contact.ownerId, type: "automation", title: "Automation follow-up", body: fill(config.message || `Follow up with ${contact.firstName} ${contact.lastName}`, contact, companyName), link: `/contacts/${contact.id}` });
      return "Owner notified";
    }
    case "assign_user": {
      if (!config.userId) return "Skipped: no user chosen.";
      await contact.update({ ownerId: Number(config.userId) });
      return "Assigned to staff";
    }
    default:
      return `Skipped: "${node.label}" is not supported yet.`;
  }
}

/** Moves one person along their workflow until it has to wait, ends or runs out of steps. */
export async function advanceExecution(executionId) {
  const execution = await AutomationExecution.findByPk(executionId);
  if (!execution || execution.status !== "active") return { done: true };
  const automation = await Automation.findByPk(execution.automationId, { include: [{ model: AutomationNode, as: "nodes" }] });
  if (!automation || automation.status !== "Active") return { paused: true };
  const contact = await Contact.findByPk(execution.contactId, { include: [{ model: Company, attributes: ["name"] }] });
  const nodes = automation.nodes;
  if (!contact) {
    await log(execution.id, null, "Left the automation", "The contact no longer exists.");
    await finish(automation, execution, "exited");
    return { done: true };
  }
  if (contact.unsubscribedAt || ["Unsubscribed", "Bounced"].includes(contact.status) || contact.optIn === "Opted Out") {
    await log(execution.id, null, "Left the automation", "The person unsubscribed, bounced or opted out.");
    await finish(automation, execution, "exited");
    return { done: true };
  }

  let current = nodes.find((n) => n.id === execution.currentNodeId) || nodes.find((n) => n.type === "trigger");
  if (execution.context?.armed) execution.context = { ...execution.context, armed: false };

  for (let i = 0; i < MAX_STEPS; i += 1) {
    const kids = childrenOf(nodes, current.id);
    let next;
    if (current.type === "condition") {
      const yes = await evalCondition(current, execution, contact);
      await log(execution.id, current, `Checked: ${current.label}`, yes ? "Yes" : "No");
      next = kids.find((c) => c.branch === (yes ? "yes" : "no"));
      if (!next) {
        await finish(automation, execution, yes ? "completed" : "exited");
        return { done: true };
      }
    } else {
      next = kids.find((c) => !c.branch) || kids[0];
      if (!next) {
        await finish(automation, execution, "completed");
        return { done: true };
      }
    }
    current = next;

    if (current.type === "delay") {
      const c = current.config || {};
      const ms = ((Number(c.days) || 0) * 86400 + (Number(c.hours) || 0) * 3600 + (Number(c.minutes) || 0) * 60) * 1000;
      await execution.update({ currentNodeId: current.id, nextRunAt: new Date(Date.now() + Math.max(ms, 60000)), context: { ...(execution.context || {}), armed: true } });
      await log(execution.id, current, current.label, "Waiting");
      return { waiting: true };
    }
    if (current.type === "exit") {
      await log(execution.id, current, current.label);
      await finish(automation, execution, "completed", current.key === "converted");
      return { done: true };
    }
    if (current.type === "action") {
      let result;
      try {
        result = await runAction(current, automation, execution, contact);
      } catch (err) {
        result = err instanceof ProviderNotConfiguredError ? `Failed: ${err.message}` : `Failed: ${String(err.message || err).slice(0, 200)}`;
      }
      await log(execution.id, current, current.label, result);
      await execution.update({ currentNodeId: current.id, context: execution.context });
      await contact.reload({ include: [{ model: Company, attributes: ["name"] }] });
    } else {
      await execution.update({ currentNodeId: current.id });
    }
  }
  await execution.update({ nextRunAt: new Date(Date.now() + 60000) });
  return { more: true };
}

/** Scheduler entry point: wakes everyone whose wait is over. */
export async function runDueAutomations({ budgetMs = 15000, limit = 200 } = {}) {
  const started = Date.now();
  const due = await AutomationExecution.findAll({
    where: { status: "active", nextRunAt: { [Op.lte]: new Date() } },
    include: [{ model: Automation, attributes: ["id"], where: { status: "Active" }, required: true }],
    order: [["nextRunAt", "ASC"]],
    limit,
    attributes: ["id"],
  });
  let advanced = 0;
  for (const e of due) {
    if (Date.now() - started > budgetMs) break;
    try {
      await advanceExecution(e.id);
      advanced += 1;
    } catch (err) {
      console.error("[automation] step failed:", err?.message || err);
      await AutomationExecution.update({ nextRunAt: new Date(Date.now() + 10 * 60000) }, { where: { id: e.id } });
    }
  }
  return { due: due.length, advanced };
}

/** Called when a tracked link in an automation email is opened or clicked. */
export async function recordAutomationEmailEvent(executionId, contactId, type) {
  const execution = await AutomationExecution.findByPk(executionId);
  if (!execution || String(execution.contactId) !== String(contactId)) return { ignored: true };
  const ctx = execution.context || {};
  const last = ctx.lastEmail || {};
  const firstOpen = type === "opened" && !last.opened;
  const firstClick = type === "clicked" && !last.clicked;
  if (!firstOpen && !firstClick) return { ignored: true };
  await execution.update({ context: { ...ctx, lastEmail: { ...last, opened: true, ...(type === "clicked" ? { clicked: true } : {}) } } });
  const contact = await Contact.findByPk(contactId);
  if (!contact) return { ignored: true };
  const patch = { lastActivityAt: new Date(), engagementStatus: type === "clicked" ? "Clicked" : contact.engagementStatus === "Clicked" ? "Clicked" : "Opened" };
  if (contact.status === "New") patch.status = "Engaged";
  await contact.update(patch);
  await applyScoreEvent(contact, type === "clicked" ? "Email clicked" : "Email opened");
  return { recorded: true };
}

// ------------------------------------------------------- building workflows

const STEP_KINDS = new Set(["wait", "send_email", "send_whatsapp", "create_task", "notify_owner", "update_status", "condition"]);

function describeStep(kind, c) {
  switch (kind) {
    case "wait": {
      const parts = [Number(c.days) ? `${Number(c.days)} day${Number(c.days) === 1 ? "" : "s"}` : null, Number(c.hours) ? `${Number(c.hours)} hour${Number(c.hours) === 1 ? "" : "s"}` : null].filter(Boolean);
      return `Wait ${parts.join(" ") || "1 hour"}`;
    }
    case "send_email": return `Send email: ${c.subject}`;
    case "send_whatsapp": return "Send WhatsApp message";
    case "create_task": return `Create task: ${c.title}`;
    case "notify_owner": return "Notify the contact's owner";
    case "update_status": return `Mark ${c.status}`;
    case "condition": return `Condition: ${CONDITION_OPTIONS.find((o) => o.value === c.key)?.label || c.key}?`;
    default: return kind;
  }
}

/** Validates a step from the builder form and returns the node fields. */
export function buildStepNode(kind, input) {
  if (!STEP_KINDS.has(kind)) throw new Error("Choose a step type.");
  const c = {};
  if (kind === "wait") {
    c.days = Math.max(0, Math.floor(Number(input.days) || 0));
    c.hours = Math.max(0, Math.floor(Number(input.hours) || 0));
    if (!c.days && !c.hours) throw new Error("Enter how long to wait (days or hours).");
    if (c.days > 365) throw new Error("Wait at most 365 days.");
    return { type: "delay", key: "wait", label: describeStep(kind, c), config: c };
  }
  if (kind === "send_email") {
    c.subject = String(input.subject || "").trim();
    c.body = String(input.body || "").trim();
    if (!c.subject || !c.body) throw new Error("Write the subject and the message of the email.");
    return { type: "action", key: "send_email", label: describeStep(kind, c).slice(0, 150), config: c };
  }
  if (kind === "send_whatsapp") {
    c.message = String(input.message || "").trim();
    if (!c.message) throw new Error("Write the WhatsApp message.");
    return { type: "action", key: "send_whatsapp", label: describeStep(kind, c), config: c };
  }
  if (kind === "create_task") {
    c.title = String(input.title || "").trim();
    c.dueInDays = Math.max(0, Math.floor(Number(input.dueInDays) || 1));
    if (!c.title) throw new Error("Give the task a title.");
    return { type: "action", key: "create_task", label: describeStep(kind, c).slice(0, 150), config: c };
  }
  if (kind === "notify_owner") {
    c.message = String(input.message || "").trim();
    return { type: "action", key: "notify_owner", label: describeStep(kind, c), config: c };
  }
  if (kind === "update_status") {
    c.status = String(input.status || "");
    if (!CONTACT_STATUSES.includes(c.status)) throw new Error("Pick a status.");
    return { type: "action", key: "update_status", label: describeStep(kind, c), config: c };
  }
  c.key = String(input.conditionKey || "");
  if (!CONDITION_OPTIONS.some((o) => o.value === c.key)) throw new Error("Pick what to check.");
  return { type: "condition", key: c.key, label: describeStep(kind, c), config: {} };
}
