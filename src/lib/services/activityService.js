import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys } from "./departmentService";

const { Activity, Contact, Company, Deal, User } = db;

export async function listActivities(user, { page = 1, limit = 30, type } = {}) {
  const deptKeys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  const deptIds = await departmentIdsForKeys(deptKeys);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  // Activities aren't directly department-scoped, so join through whichever
  // related record they're attached to.
  const [contactIds, companyIds, dealIds] = await Promise.all([
    Contact.findAll({ where: { departmentId: { [Op.in]: deptIds } }, attributes: ["id"], raw: true }),
    Company.findAll({ where: { departmentId: { [Op.in]: deptIds } }, attributes: ["id"], raw: true }),
    Deal.findAll({ where: { departmentId: { [Op.in]: deptIds } }, attributes: ["id"], raw: true }),
  ]);

  const where = {
    [Op.or]: [
      { contactId: { [Op.in]: contactIds.map((c) => c.id) } },
      { companyId: { [Op.in]: companyIds.map((c) => c.id) } },
      { dealId: { [Op.in]: dealIds.map((d) => d.id) } },
    ],
  };
  if (type) where.type = type;

  const { rows, count } = await Activity.findAndCountAll({
    where,
    include: [
      { model: Contact, attributes: ["id", "firstName", "lastName"] },
      { model: Company, attributes: ["id", "name"] },
      { model: Deal, attributes: ["id", "name"] },
      { model: User, attributes: ["id", "name"] },
    ],
    order: [["occurredAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}
