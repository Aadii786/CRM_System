import "server-only";
import { Op, fn, col } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { buildSegmentWhere } from "./segmentService";
import { recordAudit } from "./auditService";
import { getEmailProvider, providerName, isSimulatedProvider, ProviderNotConfiguredError } from "@/lib/email/provider";
import { renderForRecipient } from "@/lib/email/render";
import { verifyToken } from "@/lib/email/tokens";

const { Campaign, CampaignRecipient, CampaignEvent, Contact, Company, SegmentCondition, Department, Activity } = db;

/**
 * Campaign delivery (IKL Sprint 2): audience -> queue -> send through the
 * provider -> track. Works with ANY provider driver (see lib/email/provider);
 * today the driver is "simulated" so no real email leaves the system.
 *
 *  - queueCampaign:      one CampaignRecipient row per eligible contact, status "queued"
 *  - processCampaign:    sends queued recipients in small batches within a time budget
 *  - runDueCampaigns:    called by the scheduler (/api/cron/campaigns): starts scheduled
 *                        campaigns whose time has come and continues unfinished ones
 *  - recordEmailEvent:   the single entry point for delivered / opened / clicked /
 *                        bounced / unsubscribed, whether it comes from our tracking
 *                        links, the provider webhook or the demo simulator
 */

const RANK = { queued: 0, failed: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };
const TERMINAL = new Set(["bounced", "unsubscribed"]);
const BATCH = 100;

// ------------------------------------------------------------------ audience

async function audienceBase(campaign) {
  if (!campaign.segmentId) return { departmentId: campaign.departmentId };
  const conditions = await SegmentCondition.findAll({ where: { segmentId: campaign.segmentId } });
  return buildSegmentWhere(conditions, { departmentId: campaign.departmentId });
}

/** Who may NOT be emailed: no address, unsubscribed, bounced, opted out. */
const ELIGIBLE = [
  { email: { [Op.ne]: "" } },
  { status: { [Op.notIn]: ["Unsubscribed", "Bounced"] } },
  { optIn: { [Op.ne]: "Opted Out" } },
  { unsubscribedAt: null },
];

export async function audienceCounts(campaign) {
  const base = await audienceBase(campaign);
  const [total, eligible] = await Promise.all([
    Contact.count({ where: base }),
    Contact.count({ where: { [Op.and]: [base, ...ELIGIBLE] } }),
  ]);
  return { total, eligible, excluded: total - eligible };
}

async function queueCampaign(campaign) {
  const base = await audienceBase(campaign);
  const where = { [Op.and]: [base, ...ELIGIBLE] };
  let lastId = 0;
  for (;;) {
    const rows = await Contact.findAll({ where: { [Op.and]: [where, { id: { [Op.gt]: lastId } }] }, attributes: ["id"], order: [["id", "ASC"]], limit: 1000, raw: true });
    if (!rows.length) break;
    await CampaignRecipient.bulkCreate(rows.map((r) => ({ campaignId: campaign.id, contactId: r.id, status: "queued" })), { ignoreDuplicates: true });
    lastId = rows[rows.length - 1].id;
  }
  const count = await CampaignRecipient.count({ where: { campaignId: campaign.id } });
  await campaign.update({ recipientsCount: count });
  return count;
}

// -------------------------------------------------------------------- counters

export async function recomputeCounters(campaignId) {
  // Engagement counts come from the event history (distinct people), so someone who opens a
  // link and later unsubscribes still counts as having opened it. Bounces and unsubscribes
  // come from the recipient's final status.
  const [statusRows, eventRows, total] = await Promise.all([
    CampaignRecipient.findAll({ where: { campaignId }, attributes: ["status", [fn("COUNT", col("id")), "n"]], group: ["status"], raw: true }),
    db.sequelize.query(
      "SELECT type, COUNT(DISTINCT contact_id) AS n FROM campaign_events WHERE campaign_id = :id AND type IN ('delivered','opened','clicked') GROUP BY type",
      { replacements: { id: campaignId }, type: db.Sequelize.QueryTypes.SELECT }
    ),
    CampaignRecipient.count({ where: { campaignId } }),
  ]);
  const status = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.n)]));
  const ev = Object.fromEntries(eventRows.map((r) => [r.type, Number(r.n)]));
  const clicked = ev.clicked || 0;
  const opened = Math.max(ev.opened || 0, clicked);
  const delivered = Math.max(ev.delivered || 0, opened);
  await Campaign.update(
    { recipientsCount: total, deliveredCount: delivered, openedCount: opened, clickedCount: clicked, bouncedCount: status.bounced || 0, unsubscribedCount: status.unsubscribed || 0 },
    { where: { id: campaignId } }
  );
}

// ------------------------------------------------------------------- sending

export async function processCampaign(campaignId, { budgetMs = 8000 } = {}) {
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign || campaign.status !== "Sending") return { sent: 0, remaining: 0, done: true };
  const provider = getEmailProvider(campaign.provider || providerName());
  const started = Date.now();
  let sent = 0;

  for (;;) {
    const batch = await CampaignRecipient.findAll({
      where: { campaignId, status: "queued", error: null },
      include: [{ model: Contact, attributes: ["id", "firstName", "lastName", "email", "engagementStatus"], include: [{ model: Company, attributes: ["name"] }] }],
      order: [["id", "ASC"]],
      limit: BATCH,
    });
    if (!batch.length) break;

    const events = [];
    const deliveredContactIds = [];
    for (const r of batch) {
      if (Date.now() - started > budgetMs) {
        if (events.length) await CampaignEvent.bulkCreate(events);
        await recomputeCounters(campaignId);
        return { sent, remaining: await CampaignRecipient.count({ where: { campaignId, status: "queued", error: null } }), done: false };
      }
      const contact = r.Contact;
      if (!contact) {
        await r.update({ status: "failed", error: "Contact no longer exists" });
        continue;
      }
      try {
        const message = renderForRecipient(campaign, contact, contact.Company?.name || "");
        const result = await provider.send({
          to: contact.email,
          toName: `${contact.firstName} ${contact.lastName}`.trim(),
          from: campaign.senderEmail,
          fromName: campaign.senderName,
          replyTo: campaign.replyTo,
          ...message,
          metadata: { campaignId: campaign.id, contactId: contact.id },
        });
        if (!result?.ok) throw new Error(result?.error || "The provider did not accept the message.");
        const delivered = result.status === "delivered";
        await r.update({ status: delivered ? "delivered" : "sent", providerMessageId: result.providerMessageId || null, sentAt: new Date(), lastEventAt: new Date() });
        events.push({ campaignId, contactId: contact.id, type: "sent", occurredAt: new Date() });
        if (delivered) {
          events.push({ campaignId, contactId: contact.id, type: "delivered", occurredAt: new Date() });
          if (contact.engagementStatus === "Inactive") deliveredContactIds.push(contact.id);
        }
        sent += 1;
      } catch (err) {
        if (err instanceof ProviderNotConfiguredError) {
          if (events.length) await CampaignEvent.bulkCreate(events);
          await campaign.update({ status: "Failed", errorMessage: err.message.slice(0, 500) });
          await recomputeCounters(campaignId);
          return { sent, remaining: 0, done: true, failed: true, error: err.message };
        }
        await r.update({ status: "failed", error: String(err.message || err).slice(0, 250) });
      }
    }
    if (events.length) await CampaignEvent.bulkCreate(events);
    if (deliveredContactIds.length) await Contact.update({ engagementStatus: "Delivered", lastActivityAt: new Date() }, { where: { id: { [Op.in]: deliveredContactIds }, engagementStatus: "Inactive" } });
  }

  await recomputeCounters(campaignId);
  await campaign.update({ status: "Sent", sentAt: new Date() });
  return { sent, remaining: 0, done: true };
}

async function claim(campaignId, fromStatuses) {
  const [affected] = await Campaign.update(
    { status: "Sending", startedAt: new Date(), provider: providerName(), errorMessage: null },
    { where: { id: campaignId, status: { [Op.in]: fromStatuses } } }
  );
  return affected === 1;
}

/** "Send now": queue and send for a few seconds; the scheduler finishes big campaigns. */
export async function dispatchCampaign(user, campaignId) {
  requirePermission(user, "campaigns.send");
  const campaign = await Campaign.findByPk(campaignId, { include: [Department] });
  if (!campaign) throw new Error("Campaign not found.");
  requireDepartmentAccess(user, campaign.Department?.key);
  if (campaign.status === "Sent") throw new Error("This campaign has already been sent.");
  if (campaign.status === "Failed") throw new Error("This campaign failed. Set it back to Draft, fix the problem and send again.");
  if (!campaign.bodyHtml) throw new Error("The campaign has no content yet.");

  if (campaign.status !== "Sending") {
    if (!(await claim(campaignId, ["Draft", "Scheduled", "Paused"]))) throw new Error("This campaign is already being sent.");
    const fresh = await Campaign.findByPk(campaignId);
    const counts = await audienceCounts(fresh);
    const queued = await queueCampaign(fresh);
    if (!queued) {
      await fresh.update({ status: "Draft" });
      throw new Error("No one can be emailed: the audience is empty or everyone has unsubscribed, bounced or opted out.");
    }
    await recordAudit({ userId: user.id, action: `Started sending campaign "${campaign.name}" to ${queued} recipients`, module: "campaigns", resourceType: "Campaign", resourceId: campaignId, departmentId: campaign.departmentId });
    const result = await processCampaign(campaignId);
    return { ...result, queued, excluded: counts.excluded, simulated: isSimulatedProvider() };
  }
  const result = await processCampaign(campaignId);
  return { ...result, queued: await CampaignRecipient.count({ where: { campaignId } }), excluded: 0, simulated: isSimulatedProvider() };
}

/** Scheduler entry point: start what is due, keep sending what is unfinished. */
export async function runDueCampaigns({ budgetMs = 20000 } = {}) {
  const started = Date.now();
  const due = await Campaign.findAll({ where: { status: "Scheduled", scheduledAt: { [Op.lte]: new Date() } }, order: [["scheduledAt", "ASC"]] });
  let startedCount = 0;
  for (const c of due) {
    if (!(await claim(c.id, ["Scheduled"]))) continue;
    const fresh = await Campaign.findByPk(c.id);
    const queued = await queueCampaign(fresh);
    if (!queued) {
      await fresh.update({ status: "Failed", errorMessage: "No one can be emailed: the audience was empty at the scheduled time." });
      continue;
    }
    startedCount += 1;
  }
  const sending = await Campaign.findAll({ where: { status: "Sending" }, order: [["startedAt", "ASC"]] });
  let sent = 0;
  for (const c of sending) {
    const left = budgetMs - (Date.now() - started);
    if (left <= 500) break;
    const r = await processCampaign(c.id, { budgetMs: left });
    sent += r.sent;
  }
  return { due: due.length, started: startedCount, sending: sending.length, sent };
}

// -------------------------------------------------------------------- events

/**
 * type: delivered | opened | clicked | bounced | unsubscribed
 * Ignores events for people who were never recipients of the campaign.
 */
export async function recordEmailEvent({ campaignId, contactId, type, metadata = null, occurredAt = new Date(), recompute = true }) {
  if (!["delivered", "opened", "clicked", "bounced", "unsubscribed"].includes(type)) return { ignored: "unknown event type" };
  const recipient = await CampaignRecipient.findOne({ where: { campaignId, contactId } });
  if (!recipient) return { ignored: "not a recipient" };

  const campaign = await Campaign.findByPk(campaignId, { attributes: ["id", "name", "departmentId"] });
  const contact = await Contact.findByPk(contactId);
  if (!campaign || !contact) return { ignored: "missing record" };

  let first = false;
  if (type === "bounced" || type === "unsubscribed") {
    first = recipient.status !== type;
    if (first) await recipient.update({ status: type, lastEventAt: occurredAt });
  } else if (!TERMINAL.has(recipient.status) && RANK[type] > RANK[recipient.status]) {
    first = true;
    await recipient.update({ status: type, lastEventAt: occurredAt });
  } else {
    await recipient.update({ lastEventAt: occurredAt });
  }
  // Repeated opens/clicks are kept as events (engagement), other types only once.
  if (first || type === "opened" || type === "clicked") {
    await CampaignEvent.create({ campaignId, contactId, type, occurredAt, metadata });
  }

  const patch = { lastActivityAt: occurredAt };
  if (type === "opened") patch.engagementStatus = contact.engagementStatus === "Clicked" ? "Clicked" : "Opened";
  if (type === "clicked") patch.engagementStatus = "Clicked";
  if ((type === "opened" || type === "clicked") && contact.status === "New") patch.status = "Engaged";
  if (type === "bounced") Object.assign(patch, { status: "Bounced", engagementStatus: "Bounced" });
  if (type === "unsubscribed") Object.assign(patch, { status: "Unsubscribed", engagementStatus: "Unsubscribed", optIn: "Opted Out", unsubscribedAt: occurredAt });
  if (type !== "delivered") await contact.update(patch);

  if (first && type !== "delivered") {
    const titles = { opened: "Opened", clicked: "Clicked a link in", bounced: "Email bounced for", unsubscribed: "Unsubscribed from" };
    await Activity.create({ type: "campaign", title: `${titles[type]} campaign: ${campaign.name}`, contactId, userId: null, occurredAt });
  }
  if (recompute) await recomputeCounters(campaignId);
  return { recorded: true, first };
}

/** Unsubscribe link: works even if the campaign was deleted, because the contact is what matters. */
export async function unsubscribeByToken(token) {
  const payload = verifyToken(token);
  if (!payload || payload.t !== "u") return { ok: false };
  const contact = await Contact.findByPk(payload.u);
  if (!contact) return { ok: false };
  const campaign = await Campaign.findByPk(payload.c, { attributes: ["id", "senderName"] });
  const result = await recordEmailEvent({ campaignId: payload.c, contactId: payload.u, type: "unsubscribed" });
  if (result.ignored) {
    await contact.update({ status: "Unsubscribed", engagementStatus: "Unsubscribed", optIn: "Opted Out", unsubscribedAt: new Date() });
  }
  return { ok: true, email: contact.email, senderName: campaign?.senderName || "this sender", firstName: contact.firstName };
}

/** Signed click: returns the destination to redirect to, and records the click. */
export async function recordClickByToken(token) {
  const payload = verifyToken(token);
  if (!payload || payload.t !== "c" || !/^https?:\/\//i.test(payload.url || "")) return null;
  await recordEmailEvent({ campaignId: payload.c, contactId: payload.u, type: "clicked", metadata: { url: payload.url } }).catch(() => {});
  return payload.url;
}

export async function recordOpenByToken(token) {
  const payload = verifyToken(token);
  if (!payload || payload.t !== "o") return false;
  await recordEmailEvent({ campaignId: payload.c, contactId: payload.u, type: "opened" }).catch(() => {});
  return true;
}

// ------------------------------------------------------------------ demo only

/** Demo helper (simulated provider only): produces opens, clicks and a few unsubscribes through the real event path. */
export async function simulateEngagement(user, campaignId) {
  requirePermission(user, "campaigns.send");
  if (!isSimulatedProvider()) throw new Error("Engagement can only be simulated while the email provider is the simulated one.");
  const campaign = await Campaign.findByPk(campaignId, { include: [Department] });
  if (!campaign) throw new Error("Campaign not found.");
  requireDepartmentAccess(user, campaign.Department?.key);
  const recipients = await CampaignRecipient.findAll({ where: { campaignId, status: { [Op.in]: ["sent", "delivered", "opened"] } }, order: [["id", "ASC"]], limit: 300 });
  let events = 0;
  for (const [i, r] of recipients.entries()) {
    const roll = (i * 37) % 100;
    if (roll < 55) { await recordEmailEvent({ campaignId, contactId: r.contactId, type: "opened", recompute: false }); events++; }
    if (roll < 14) { await recordEmailEvent({ campaignId, contactId: r.contactId, type: "clicked", metadata: { url: "https://ikl.com.pk" }, recompute: false }); events++; }
    if (roll === 99) { await recordEmailEvent({ campaignId, contactId: r.contactId, type: "unsubscribed", recompute: false }); events++; }
  }
  await recomputeCounters(campaignId);
  await recordAudit({ userId: user.id, action: `Simulated engagement for campaign "${campaign.name}" (demo)`, module: "campaigns", resourceType: "Campaign", resourceId: campaignId, departmentId: campaign.departmentId });
  return { events };
}
