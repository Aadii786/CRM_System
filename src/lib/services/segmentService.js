import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { Segment, SegmentCondition, Contact, User } = db;

const FIELD_TO_COLUMN = {
  status: "status",
  engagementStatus: "engagementStatus",
  leadScore: "leadScore",
  source: "source",
  city: "city",
  country: "country",
};

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, ["marketing", "ikl-hsm"]);
  return departmentIdsForKeys(keys);
}

export async function listSegments(user) {
  requirePermission(user, "segments.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  return Segment.findAll({
    where: { departmentId: { [Op.in]: deptIds } },
    include: [{ model: SegmentCondition, as: "conditions" }, { model: User, as: "creator", attributes: ["id", "name"] }],
    order: [["contactCount", "DESC"]],
  });
}

export async function getSegment(user, id) {
  requirePermission(user, "segments.view");
  return Segment.findByPk(id, { include: [{ model: SegmentCondition, as: "conditions" }] });
}

/** Builds a Sequelize where-clause from a segment's stored conditions. */
export function buildSegmentWhere(conditions, baseWhere = {}) {
  const where = { ...baseWhere };
  for (const cond of conditions) {
    const column = FIELD_TO_COLUMN[cond.field];
    if (!column) continue;
    switch (cond.operator) {
      case "equals":
        where[column] = cond.value;
        break;
      case "in":
        where[column] = { [Op.in]: cond.value.split(",") };
        break;
      case "gte":
        where[column] = { [Op.gte]: Number(cond.value) };
        break;
      case "lte":
        where[column] = { [Op.lte]: Number(cond.value) };
        break;
      case "is_not_null":
        where[column] = { [Op.ne]: null };
        break;
      default:
        break;
    }
  }
  return where;
}

export async function previewSegmentCount(user, departmentKey, conditions) {
  requirePermission(user, "segments.view");
  const dept = await departmentByKey(departmentKey);
  if (!dept) return 0;
  const where = buildSegmentWhere(conditions, { departmentId: dept.id });
  return Contact.count({ where });
}

export async function createSegment(user, { name, description, departmentKey, conditions = [] }) {
  requirePermission(user, "segments.create");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");

  const where = buildSegmentWhere(conditions, { departmentId: dept.id });
  const contactCount = await Contact.count({ where });

  const segment = await Segment.create({
    name,
    description,
    type: conditions.length ? "dynamic" : "static",
    departmentId: dept.id,
    createdBy: user.id,
    contactCount,
  });

  for (const [i, cond] of conditions.entries()) {
    await SegmentCondition.create({ segmentId: segment.id, field: cond.field, operator: cond.operator, value: cond.value, groupIndex: i });
  }

  await recordAudit({ userId: user.id, action: "Created segment", module: "segments", resourceType: "Segment", resourceId: segment.id, departmentId: dept.id });
  return segment;
}

export async function deleteSegment(user, id) {
  requirePermission(user, "segments.delete");
  await SegmentCondition.destroy({ where: { segmentId: id } });
  await Segment.destroy({ where: { id } });
  await recordAudit({ userId: user.id, action: "Deleted segment", module: "segments", resourceType: "Segment", resourceId: id });
}
