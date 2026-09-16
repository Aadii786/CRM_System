import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

const { Company, Contact, Deal, Department, User, Task, Meeting, TrainingProgram, Activity } = db;

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
