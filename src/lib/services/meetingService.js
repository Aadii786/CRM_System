import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

const { Meeting, Contact, Company, Deal, User } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function getMeetings(user, { upcoming = true } = {}) {
  requirePermission(user, "meetings.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];

  const where = { departmentId: { [Op.in]: deptIds } };
  where.startAt = upcoming ? { [Op.gte]: new Date() } : { [Op.lt]: new Date() };

  return Meeting.findAll({
    where,
    include: [
      { model: Contact, attributes: ["id", "firstName", "lastName"] },
      { model: Company, attributes: ["id", "name"] },
      { model: Deal, attributes: ["id", "name"] },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
    ],
    order: [["startAt", upcoming ? "ASC" : "DESC"]],
    limit: 100,
  });
}

export async function createMeeting(user, payload) {
  requirePermission(user, "meetings.create");
  const deptIds = await scopedDepartmentIds(user);
  const dept = await departmentByKey(payload.departmentKey || user.department?.key);
  const departmentId = dept && deptIds.includes(dept.id) ? dept.id : deptIds[0];

  const meeting = await Meeting.create({
    title: payload.title,
    contactId: payload.contactId || null,
    companyId: payload.companyId || null,
    dealId: payload.dealId || null,
    departmentId,
    ownerId: payload.ownerId || user.id,
    startAt: new Date(payload.startAt),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    location: payload.location || null,
    notes: payload.notes || null,
    status: "Scheduled",
  });

  await recordAudit({ userId: user.id, action: "Created meeting", module: "meetings", resourceType: "Meeting", resourceId: meeting.id });
  return meeting;
}

export async function updateMeetingStatus(user, id, status, outcome) {
  requirePermission(user, "meetings.update");
  const meeting = await Meeting.findByPk(id);
  if (!meeting) throw new Error("Meeting not found.");
  await meeting.update({ status, outcome: outcome ?? meeting.outcome });
  await recordAudit({ userId: user.id, action: `Meeting marked ${status}`, module: "meetings", resourceType: "Meeting", resourceId: id });
  return meeting;
}
