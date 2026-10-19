import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

const { Company, Contact, Deal, Department, User, Task, Meeting, TrainingProgram, Activity } = db;

/** Thrown when a company with the same name (or website) already exists in the department. */
export class DuplicateCompanyError extends Error {
  constructor(existing) {
    super(`A company called "${existing.name}" already exists.`);
    this.name = "DuplicateCompanyError";
    this.existingCompanyId = existing.id;
  }
}

const LEGAL_WORDS = new Set(["pvt", "private", "ltd", "limited", "inc", "llc", "co", "company", "corp", "corporation", "the", "and", "&"]);

/** "The Acme (Pvt.) Ltd" and "ACME private limited" both become "acme". */
export function normalizeCompanyName(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !LEGAL_WORDS.has(w));
  return words.join(" ");
}

function websiteHost(url) {
  if (!url) return "";
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function findDuplicateCompany(departmentId, { name, website }, excludeId = null) {
  const normalized = normalizeCompanyName(name);
  const host = websiteHost(website);
  if (!normalized && !host) return null;
  const firstWord = normalized.split(" ")[0];
  const or = [];
  if (firstWord) or.push({ name: { [Op.like]: `%${firstWord}%` } });
  if (host) or.push({ website: { [Op.like]: `%${host}%` } });
  const candidates = await Company.findAll({ where: { departmentId, [Op.or]: or }, limit: 200 });
  return (
    candidates.find((c) => {
      if (excludeId && String(c.id) === String(excludeId)) return false;
      if (normalized && normalizeCompanyName(c.name) === normalized) return true;
      return Boolean(host) && websiteHost(c.website) === host;
    }) || null
  );
}

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function getCompanies(user, { page = 1, limit = 25, q = "", organizationType, status } = {}) {
  requirePermission(user, "companies.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };
  if (organizationType) where.organizationType = organizationType;
  if (status) where.status = status;
  if (q) where.name = { [Op.like]: `%${q}%` };

  const { rows, count } = await Company.findAndCountAll({
    where,
    include: [{ model: User, as: "owner", attributes: ["id", "name", "avatarColor"] }],
    order: [["updatedAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  const ids = rows.map((r) => r.id);
  const [contactCounts, dealCounts] = await Promise.all([
    Contact.findAll({ where: { companyId: { [Op.in]: ids } }, attributes: ["companyId", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]], group: ["companyId"], raw: true }),
    Deal.findAll({ where: { companyId: { [Op.in]: ids }, status: "open" }, attributes: ["companyId", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]], group: ["companyId"], raw: true }),
  ]);
  const contactMap = Object.fromEntries(contactCounts.map((c) => [c.companyId, Number(c.count)]));
  const dealMap = Object.fromEntries(dealCounts.map((c) => [c.companyId, Number(c.count)]));

  return {
    data: rows.map((r) => ({ ...r.get({ plain: true }), contactCount: contactMap[r.id] || 0, activeDeals: dealMap[r.id] || 0 })),
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
  };
}

export async function getCompanyById(user, id) {
  requirePermission(user, "companies.view");
  const company = await Company.findByPk(id, {
    include: [{ model: Department }, { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] }],
  });
  if (!company) return null;
  requireDepartmentAccess(user, company.Department?.key);
  return company;
}

export async function getCompanyRelated(user, companyId) {
  requirePermission(user, "companies.view");
  const [contacts, deals, tasks, meetings, trainingPrograms, activities] = await Promise.all([
    Contact.findAll({ where: { companyId }, order: [["createdAt", "DESC"]] }),
    Deal.findAll({ where: { companyId }, include: [{ model: db.PipelineStage, as: "stage" }], order: [["createdAt", "DESC"]] }),
    Task.findAll({ where: { companyId }, order: [["dueDate", "ASC"]] }),
    Meeting.findAll({ where: { companyId }, order: [["startAt", "DESC"]] }),
    TrainingProgram.findAll({ where: { companyId }, order: [["createdAt", "DESC"]] }),
    Activity.findAll({ where: { companyId }, order: [["occurredAt", "DESC"]], limit: 30 }),
  ]);
  return { contacts, deals, tasks, meetings, trainingPrograms, activities };
}

export async function createCompany(user, payload) {
  requirePermission(user, "companies.create");
  const deptIds = await scopedDepartmentIds(user);
  const dept = await departmentByKey(payload.departmentKey || user.department?.key);
  if (!dept || !deptIds.includes(dept.id)) throw new Error("You cannot create a company in that department.");

  const duplicate = await findDuplicateCompany(dept.id, payload);
  if (duplicate) throw new DuplicateCompanyError(duplicate);

  const company = await Company.create({
    name: payload.name,
    organizationType: payload.organizationType || "Corporate",
    industry: payload.industry || null,
    companySize: payload.companySize || null,
    website: payload.website || null,
    phone: payload.phone || null,
    email: payload.email || null,
    address: payload.address || null,
    city: payload.city || null,
    country: payload.country || "Pakistan",
    leadSource: payload.leadSource || "Other",
    departmentId: dept.id,
    ownerId: payload.ownerId || user.id,
    status: payload.status || "Prospect",
  });

  await Activity.create({ type: "system", title: "Company created", companyId: company.id, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: "Created company", module: "companies", resourceType: "Company", resourceId: company.id, departmentId: dept.id });
  return company;
}

export async function updateCompany(user, id, payload) {
  requirePermission(user, "companies.update");
  const company = await Company.findByPk(id, { include: [Department] });
  if (!company) throw new Error("Company not found.");
  requireDepartmentAccess(user, company.Department?.key);

  if (payload.name !== undefined || payload.website !== undefined) {
    const duplicate = await findDuplicateCompany(company.departmentId, { name: payload.name ?? company.name, website: payload.website ?? company.website }, company.id);
    if (duplicate) throw new DuplicateCompanyError(duplicate);
  }

  await company.update({
    name: payload.name ?? company.name,
    organizationType: payload.organizationType ?? company.organizationType,
    industry: payload.industry ?? company.industry,
    companySize: payload.companySize ?? company.companySize,
    website: payload.website ?? company.website,
    phone: payload.phone ?? company.phone,
    email: payload.email ?? company.email,
    address: payload.address ?? company.address,
    city: payload.city ?? company.city,
    country: payload.country ?? company.country,
    status: payload.status ?? company.status,
    ownerId: payload.ownerId ?? company.ownerId,
    lastActivityAt: new Date(),
  });

  await recordAudit({ userId: user.id, action: "Updated company", module: "companies", resourceType: "Company", resourceId: id });
  return company;
}
