import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
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

const STATUS_CHANGES = {
  Draft: ["Scheduled", "Paused"],
  Scheduled: ["Paused", "Draft"],
  Paused: ["Scheduled", "Draft"],
  Failed: ["Draft"],
};

export async function updateCampaignStatus(user, id, status) {
  requirePermission(user, "campaigns.update");
  const campaign = await Campaign.findByPk(id, { include: [db.Department] });
  if (!campaign) throw new Error("Campaign not found.");
  requireDepartmentAccess(user, campaign.Department?.key);
  if (!(STATUS_CHANGES[campaign.status] || []).includes(status)) throw new Error(`A ${campaign.status.toLowerCase()} campaign cannot be set to ${status.toLowerCase()}.`);
  await campaign.update({ status });
  await recordAudit({ userId: user.id, action: `Campaign set to ${status}`, module: "campaigns", resourceType: "Campaign", resourceId: id });
  return campaign;
}

export async function deleteCampaign(user, id) {
  requirePermission(user, "campaigns.delete");
  await Campaign.destroy({ where: { id } });
  await recordAudit({ userId: user.id, action: "Deleted campaign", module: "campaigns", resourceType: "Campaign", resourceId: id });
}
