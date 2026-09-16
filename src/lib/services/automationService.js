import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

const { Automation, AutomationNode, AutomationExecution, AutomationExecutionLog, Contact, User } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function listAutomations(user) {
  requirePermission(user, "automations.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  return Automation.findAll({
    where: { departmentId: { [Op.in]: deptIds } },
    include: [{ model: User, as: "creator", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });
}

export async function getAutomation(user, id) {
  requirePermission(user, "automations.view");
  return Automation.findByPk(id, {
    include: [{ model: AutomationNode, as: "nodes", order: [["order", "ASC"]] }],
  });
}

export async function getAutomationExecutions(user, automationId, limit = 20) {
  requirePermission(user, "automations.view");
  return AutomationExecution.findAll({
    where: { automationId },
    include: [{ model: Contact, attributes: ["id", "firstName", "lastName", "leadScore", "status"] }],
    order: [["startedAt", "DESC"]],
    limit,
  });
}

const TRIGGER_LABELS = {
  contact_added: "Contact Added",
  segment_entered: "Contact Enters Segment",
  campaign_sent: "Campaign Sent",
  email_opened: "Email Opened",
  email_clicked: "Email Clicked",
  whatsapp_response: "WhatsApp Response",
  deal_stage_changed: "Deal Stage Changed",
  form_submitted: "Form Submitted",
};

/** Creates a new automation with just its trigger node (requirements #22-#23). */
export async function createAutomation(user, { name, description, departmentKey, triggerType }) {
  requirePermission(user, "automations.create");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");

  const automation = await Automation.create({
    name,
    description,
    departmentId: dept.id,
    status: "Draft",
    triggerType,
    triggerConfig: {},
    createdBy: user.id,
  });

  await AutomationNode.create({
    automationId: automation.id,
    parentId: null,
    branch: null,
    type: "trigger",
    key: triggerType,
    label: `Trigger: ${TRIGGER_LABELS[triggerType] || triggerType}`,
    config: {},
    order: 0,
  });

  await recordAudit({ userId: user.id, action: "Created automation", module: "automations", resourceType: "Automation", resourceId: automation.id, departmentId: dept.id });
  return automation;
}

export async function updateAutomationStatus(user, id, status) {
  requirePermission(user, "automations.execute");
  const automation = await Automation.findByPk(id);
  if (!automation) throw new Error("Automation not found.");
  await automation.update({ status });
  await recordAudit({ userId: user.id, action: `Automation set to ${status}`, module: "automations", resourceType: "Automation", resourceId: id });
  return automation;
}

/**
 * "Run Demo Automation" (requirements #62): walks a small batch of
 * contacts through the automation's node tree in a simplified,
 * deterministic way and writes real execution + activity + notification
 * rows, so the automation's own detail page and the affected contacts'
 * timelines both reflect it immediately. This is a demo simulation, not a
 * real scheduler - see requirements #106 on not claiming real background
 * execution infrastructure that doesn't exist yet.
 */
export async function runDemoAutomation(user, automationId, batchSize = 12) {
  requirePermission(user, "automations.execute");
  const automation = await Automation.findByPk(automationId, {
    include: [{ model: AutomationNode, as: "nodes" }],
  });
  if (!automation) throw new Error("Automation not found.");

  const contacts = await Contact.findAll({
    where: { departmentId: automation.departmentId },
    order: [["leadScore", "DESC"]],
    limit: batchSize,
  });

  const steps = [];
  let converted = 0;

  for (const contact of contacts) {
    const execution = await AutomationExecution.create({
      automationId,
      contactId: contact.id,
      status: "active",
      startedAt: new Date(),
    });

    const engaged = contact.leadScore >= 40 || Math.random() > 0.4;
    const clicked = engaged && (contact.leadScore >= 60 || Math.random() > 0.5);
    const path = [];

    path.push("Entered automation");
    await AutomationExecutionLog.create({ executionId: execution.id, action: "Entered automation", occurredAt: new Date() });

    path.push(engaged ? "Email #1 opened" : "Email #1 not opened");
    await AutomationExecutionLog.create({ executionId: execution.id, action: path.at(-1), occurredAt: new Date() });

    if (engaged) {
      path.push("Sent Email #2");
      if (clicked) {
        path.push("Email #2 clicked");
        path.push("Marked Interested");
        path.push("WhatsApp message sent");
        path.push("Assigned to staff");
        path.push("Follow-up task created");
        converted++;

        await contact.update({ status: contact.status === "Converted" ? contact.status : "Qualified", engagementStatus: "Clicked", leadScore: Math.min(100, contact.leadScore + 15) });
        await db.Activity.bulkCreate(
          path.slice(2).map((title) => ({ type: "automation", title, contactId: contact.id, occurredAt: new Date() }))
        );
        await execution.update({ status: "completed", completedAt: new Date() });
      } else {
        path.push("Sent Email #3");
        await execution.update({ status: "completed", completedAt: new Date() });
      }
    } else {
      path.push("Sent Email #2 (retry)");
      await execution.update({ status: "exited", completedAt: new Date() });
    }

    for (const action of path) {
      await AutomationExecutionLog.create({ executionId: execution.id, action, occurredAt: new Date() });
    }

    steps.push({ contactId: contact.id, contactName: `${contact.firstName} ${contact.lastName}`, path });
  }

  await automation.update({
    totalEntered: automation.totalEntered + contacts.length,
    totalCompleted: automation.totalCompleted + contacts.length,
    totalConverted: automation.totalConverted + converted,
  });

  await recordAudit({ userId: user.id, action: `Ran demo automation "${automation.name}" (${contacts.length} contacts, ${converted} converted)`, module: "automations", resourceType: "Automation", resourceId: automationId });

  return { processed: contacts.length, converted, steps };
}
