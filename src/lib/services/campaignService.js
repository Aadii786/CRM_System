import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { buildSegmentWhere } from "./segmentService";
import { recordAudit } from "./auditService";
import { renderEmailDesignToHtml } from "@/lib/emailDesign/render";

const { Campaign, Segment, SegmentCondition, User, Contact, CampaignRecipient, CampaignEvent } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function listCampaigns(user, { status, page = 1, limit = 20 } = {}) {
  requirePermission(user, "campaigns.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };
  if (status) where.status = status;

  const { rows, count } = await Campaign.findAndCountAll({
    where,
    include: [{ model: Segment, attributes: ["id", "name"] }, { model: User, as: "creator", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

export async function getCampaign(user, id) {
  requirePermission(user, "campaigns.view");
  return Campaign.findByPk(id, {
    include: [{ model: Segment, include: [{ model: SegmentCondition, as: "conditions" }] }, { model: User, as: "creator", attributes: ["id", "name"] }],
  });
}

export async function getCampaignRecipients(user, campaignId, limit = 100) {
  requirePermission(user, "campaigns.view");
  return CampaignRecipient.findAll({
    where: { campaignId },
    include: [{ model: Contact, attributes: ["id", "firstName", "lastName", "email"] }],
    order: [["id", "ASC"]],
    limit,
  });
}

export async function createCampaign(user, payload) {
  requirePermission(user, "campaigns.create");
  const dept = await departmentByKey(user.department?.key);
  if (!dept) throw new Error("No department scope.");

  let recipientsCount = 0;
  if (payload.segmentId) {
    const segment = await Segment.findByPk(payload.segmentId, { include: [{ model: SegmentCondition, as: "conditions" }] });
    recipientsCount = segment?.contactCount || 0;
  }

  // Every department sends campaigns from its own identity - fall back to
  // the creating user's department defaults (Settings > Departments) rather
  // than a single hardcoded university address, so Marketing, IKL/HSM and
  // any future department each look like they're mailing from themselves.
  const bodyDesign = Array.isArray(payload.bodyDesign) ? payload.bodyDesign : [];
  const campaign = await Campaign.create({
    name: payload.name,
    subject: payload.subject,
    senderName: payload.senderName || dept.senderName || "University Admissions Office",
    senderEmail: payload.senderEmail || dept.senderEmail || "admissions@university.edu.pk",
    replyTo: payload.replyTo || dept.replyTo || payload.senderEmail || dept.senderEmail || "admissions@university.edu.pk",
    bodyDesign,
    bodyHtml: renderEmailDesignToHtml(bodyDesign, { subject: payload.subject }),
    segmentId: payload.segmentId || null,
    departmentId: dept.id,
    createdBy: user.id,
    status: payload.schedule ? "Scheduled" : "Draft",
    scheduledAt: payload.schedule ? new Date(payload.schedule) : null,
    recipientsCount,
  });

  await recordAudit({ userId: user.id, action: "Created campaign", module: "campaigns", resourceType: "Campaign", resourceId: campaign.id, departmentId: dept.id });
  return campaign;
}

/**
 * Simulated send (requirements #61-#62, #106): moves the campaign to Sent,
 * generates realistic delivery/open/click counters, and records the same
 * events against a representative sample of the target segment's contacts
 * so the recipients tab and contact timelines both stay consistent. No
 * real email is ever dispatched.
 */
export async function simulateSendCampaign(user, campaignId) {
  requirePermission(user, "campaigns.send");
  const campaign = await Campaign.findByPk(campaignId, { include: [Segment] });
  if (!campaign) throw new Error("Campaign not found.");

  const audience = campaign.recipientsCount || 100;
  const delivered = Math.round(audience * 0.97);
  const opened = Math.round(delivered * 0.52);
  const clicked = Math.round(opened * 0.2);
  const bounced = audience - delivered;
  const unsubscribed = Math.round(delivered * 0.004);

  await campaign.update({
    status: "Sent",
    sentAt: new Date(),
    deliveredCount: delivered,
    openedCount: opened,
    clickedCount: clicked,
    bouncedCount: bounced,
    unsubscribedCount: unsubscribed,
  });

  const where = campaign.Segment
    ? buildSegmentWhere(await SegmentCondition.findAll({ where: { segmentId: campaign.segmentId } }), { departmentId: campaign.departmentId })
    : { departmentId: campaign.departmentId };

  const sample = await Contact.findAll({ where, limit: 100, order: [["leadScore", "DESC"]] });
  for (const [i, contact] of sample.entries()) {
    const status = i < clicked ? "clicked" : i < opened ? "opened" : i < delivered ? "delivered" : "bounced";
    await CampaignRecipient.upsert({ campaignId: campaign.id, contactId: contact.id, status });
    await CampaignEvent.create({ campaignId: campaign.id, contactId: contact.id, type: "sent", occurredAt: new Date() });
    if (status !== "delivered") {
      await CampaignEvent.create({ campaignId: campaign.id, contactId: contact.id, type: status, occurredAt: new Date() });
    }
    if (status === "clicked" || status === "opened") {
      await contact.update({ engagementStatus: status === "clicked" ? "Clicked" : "Opened", lastActivityAt: new Date() });
    }
  }

  await recordAudit({ userId: user.id, action: `Sent campaign "${campaign.name}"`, module: "campaigns", resourceType: "Campaign", resourceId: campaign.id });
  return campaign;
}

export async function updateCampaignStatus(user, id, status) {
  requirePermission(user, "campaigns.update");
  const campaign = await Campaign.findByPk(id);
  if (!campaign) throw new Error("Campaign not found.");
  await campaign.update({ status });
  await recordAudit({ userId: user.id, action: `Campaign set to ${status}`, module: "campaigns", resourceType: "Campaign", resourceId: id });
  return campaign;
}

export async function deleteCampaign(user, id) {
  requirePermission(user, "campaigns.delete");
  await Campaign.destroy({ where: { id } });
  await recordAudit({ userId: user.id, action: "Deleted campaign", module: "campaigns", resourceType: "Campaign", resourceId: id });
}
