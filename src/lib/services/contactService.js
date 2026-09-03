import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { Contact, Company, Department, User, Tag, Activity, Deal, Task, Meeting, CampaignRecipient, Campaign, Conversation, PipelineStage } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  return departmentIdsForKeys(keys);
}

/**
 * Paginated, filterable, sorted contact listing (requirements #15-#17).
 * Never loads the full 58,000+ row table into memory - every list screen
 * must go through this function with an explicit page/limit.
 */
export async function getContacts(user, {
  page = 1,
  limit = 25,
  q = "",
  status,
  source,
  engagementStatus,
  departmentKey,
  sortBy = "createdAt",
  sortDir = "DESC",
} = {}) {
  requirePermission(user, "contacts.view");

  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };

  if (departmentKey) {
    // Only honour a client-requested department filter if it's one the
    // user is actually scoped to - never trust it outright (requirements #11).
    const dept = await departmentByKey(departmentKey);
    if (dept && deptIds.includes(dept.id)) where.departmentId = dept.id;
  }
  if (status) where.status = status;
  if (source) where.source = source;
  if (engagementStatus) where.engagementStatus = engagementStatus;
  if (q) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${q}%` } },
      { lastName: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { phone: { [Op.like]: `%${q}%` } },
    ];
  }

  const SORTABLE = new Set(["createdAt", "updatedAt", "leadScore", "lastActivityAt", "firstName", "status"]);
  const orderField = SORTABLE.has(sortBy) ? sortBy : "createdAt";

  const { rows, count } = await Contact.findAndCountAll({
    where,
    include: [
      { model: Company, attributes: ["id", "name"] },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
    ],
    order: [[orderField, sortDir === "ASC" ? "ASC" : "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
  };
}

export async function getContactStats(user, departmentKey) {
  requirePermission(user, "contacts.view");
  const deptIds = await scopedDepartmentIds(user);
  let scoped = deptIds;
  if (departmentKey) {
    const dept = await departmentByKey(departmentKey);
    if (dept && deptIds.includes(dept.id)) scoped = [dept.id];
  }
  if (scoped.length === 0) return { total: 0, byStatus: {}, byEngagement: {} };

  const [total, statusRows, engagementRows] = await Promise.all([
    Contact.count({ where: { departmentId: { [Op.in]: scoped } } }),
    Contact.findAll({
      where: { departmentId: { [Op.in]: scoped } },
      attributes: ["status", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    }),
    Contact.findAll({
      where: { departmentId: { [Op.in]: scoped } },
      attributes: ["engagementStatus", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      group: ["engagementStatus"],
      raw: true,
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)])),
    byEngagement: Object.fromEntries(engagementRows.map((r) => [r.engagementStatus, Number(r.count)])),
  };
}

export async function getContactById(user, id) {
  requirePermission(user, "contacts.view");
  const contact = await Contact.findByPk(id, {
    include: [
      { model: Company, attributes: ["id", "name", "organizationType"] },
      { model: Department, attributes: ["id", "key", "name"] },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor", "jobTitle"] },
      { model: Tag },
    ],
  });
  if (!contact) return null;
  requireDepartmentAccess(user, contact.Department?.key);
  return contact;
}

export async function getContactTimeline(user, contactId, limit = 50) {
  requirePermission(user, "contacts.view");
  return Activity.findAll({
    where: { contactId },
    include: [{ model: User, attributes: ["id", "name"] }],
    order: [["occurredAt", "DESC"]],
    limit,
  });
}

export async function getContactRelated(user, contactId) {
  requirePermission(user, "contacts.view");
  const [deals, tasks, meetings, campaignRecipients, conversation] = await Promise.all([
    Deal.findAll({ where: { contactId }, include: [{ model: PipelineStage, as: "stage" }], order: [["createdAt", "DESC"]] }),
    Task.findAll({ where: { contactId }, order: [["dueDate", "ASC"]] }),
    Meeting.findAll({ where: { contactId }, order: [["startAt", "DESC"]] }),
    CampaignRecipient.findAll({ where: { contactId }, include: [Campaign], order: [["createdAt", "DESC"]] }),
    Conversation.findOne({ where: { contactId } }),
  ]);
  return { deals, tasks, meetings, campaignRecipients, conversation };
}

/** Thrown by createContact when the email already exists in the same department - carries the existing contact's id so the caller can offer "View Existing Contact" instead of silently failing. */
export class DuplicateContactError extends Error {
  constructor(existingContactId) {
    super("A contact with this email already exists.");
    this.name = "DuplicateContactError";
    this.existingContactId = existingContactId;
  }
}

export async function createContact(user, payload) {
  requirePermission(user, "contacts.create");
  const deptIds = await scopedDepartmentIds(user);
  const dept = await departmentByKey(payload.departmentKey || user.department?.key);
  if (!dept || !deptIds.includes(dept.id)) {
    throw new Error("You cannot create a contact in that department.");
  }

  if (payload.email) {
    const existing = await Contact.findOne({ where: { email: payload.email, departmentId: dept.id } });
    if (existing) throw new DuplicateContactError(existing.id);
  }

  const contact = await Contact.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone || null,
    whatsappNumber: payload.whatsappNumber || null,
    landlineNumber: payload.landlineNumber || null,
    externalId: payload.externalId || null,
    linkedin: payload.linkedin || null,
    timezone: payload.timezone || null,
    detectedLanguage: payload.detectedLanguage || null,
    doubleOptIn: payload.doubleOptIn || "No",
    optIn: payload.optIn || "Unknown",
    contactType: payload.contactType || "Lead",
    jobTitle: payload.jobTitle || null,
    city: payload.city || null,
    country: payload.country || "Pakistan",
    companyId: payload.companyId || null,
    departmentId: dept.id,
    ownerId: payload.ownerId || user.id,
    source: payload.source || "Other",
    status: payload.status || "New",
    leadScore: 0,
  });

  await Activity.create({
    type: "system",
    title: "Contact created",
    contactId: contact.id,
    userId: user.id,
    occurredAt: new Date(),
  });

  if (payload.listIds?.length) {
    const { setContactLists } = await import("./listService");
    await setContactLists(user, contact.id, payload.listIds).catch(() => {});
  }

  await recordAudit({ userId: user.id, action: "Created contact", module: "contacts", resourceType: "Contact", resourceId: contact.id, departmentId: dept.id });

  return contact;
}

export async function updateContact(user, id, payload) {
  requirePermission(user, "contacts.update");
  const contact = await Contact.findByPk(id, { include: [Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);

  const previousStatus = contact.status;
  await contact.update({
    firstName: payload.firstName ?? contact.firstName,
    lastName: payload.lastName ?? contact.lastName,
    email: payload.email ?? contact.email,
    phone: payload.phone ?? contact.phone,
    whatsappNumber: payload.whatsappNumber ?? contact.whatsappNumber,
    landlineNumber: payload.landlineNumber ?? contact.landlineNumber,
    externalId: payload.externalId ?? contact.externalId,
    linkedin: payload.linkedin ?? contact.linkedin,
    timezone: payload.timezone ?? contact.timezone,
    detectedLanguage: payload.detectedLanguage ?? contact.detectedLanguage,
    doubleOptIn: payload.doubleOptIn ?? contact.doubleOptIn,
    optIn: payload.optIn ?? contact.optIn,
    contactType: payload.contactType ?? contact.contactType,
    jobTitle: payload.jobTitle ?? contact.jobTitle,
    city: payload.city ?? contact.city,
    country: payload.country ?? contact.country,
    companyId: payload.companyId ?? contact.companyId,
    ownerId: payload.ownerId ?? contact.ownerId,
    source: payload.source ?? contact.source,
    status: payload.status ?? contact.status,
    lastActivityAt: new Date(),
  });

  if (payload.listIds !== undefined) {
    const { setContactLists } = await import("./listService");
    await setContactLists(user, contact.id, payload.listIds).catch(() => {});
  }

  if (payload.status && payload.status !== previousStatus) {
    await Activity.create({
      type: "status_change",
      title: `Status changed to ${payload.status}`,
      description: `Previously ${previousStatus}`,
      contactId: contact.id,
      userId: user.id,
      occurredAt: new Date(),
    });
  }

  await recordAudit({ userId: user.id, action: "Updated contact", module: "contacts", resourceType: "Contact", resourceId: contact.id });
  return contact;
}

export async function deleteContact(user, id) {
  requirePermission(user, "contacts.delete");
  const contact = await Contact.findByPk(id, { include: [Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);
  await contact.destroy();
  await recordAudit({ userId: user.id, action: "Deleted contact", module: "contacts", resourceType: "Contact", resourceId: id });
}

export async function bulkUpdateStatus(user, ids, status) {
  requirePermission(user, "contacts.update");
  const deptIds = await scopedDepartmentIds(user);
  await Contact.update(
    { status },
    { where: { id: { [Op.in]: ids }, departmentId: { [Op.in]: deptIds } } }
  );
  await recordAudit({ userId: user.id, action: `Bulk updated ${ids.length} contacts to ${status}`, module: "contacts", result: "success" });
}
