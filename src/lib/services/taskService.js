import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

const { Task, Contact, Company, Deal, User } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

export async function getTasks(user, { page = 1, limit = 25, status, priority, ownerId, q } = {}) {
  requirePermission(user, "tasks.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (ownerId) where.ownerId = ownerId;
  if (q) where.title = { [Op.like]: `%${q}%` };

  const { rows, count } = await Task.findAndCountAll({
    where,
    include: [
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
      { model: Contact, attributes: ["id", "firstName", "lastName"] },
      { model: Company, attributes: ["id", "name"] },
      { model: Deal, attributes: ["id", "name"] },
    ],
    order: [["dueDate", "ASC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

export async function getTaskStats(user) {
  requirePermission(user, "tasks.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { pending: 0, overdue: 0, completed: 0, total: 0 };

  const [total, pending, overdue, completed] = await Promise.all([
    Task.count({ where: { departmentId: { [Op.in]: deptIds } } }),
    Task.count({ where: { departmentId: { [Op.in]: deptIds }, status: "Pending" } }),
    Task.count({ where: { departmentId: { [Op.in]: deptIds }, status: "Overdue" } }),
    Task.count({ where: { departmentId: { [Op.in]: deptIds }, status: "Completed" } }),
  ]);
  return { total, pending, overdue, completed };
}

export async function createTask(user, payload) {
  requirePermission(user, "tasks.create");
  const deptIds = await scopedDepartmentIds(user);
  const dept = await departmentByKey(payload.departmentKey || user.department?.key);
  const departmentId = dept && deptIds.includes(dept.id) ? dept.id : deptIds[0];

  const task = await Task.create({
    title: payload.title,
    description: payload.description || null,
    ownerId: payload.ownerId || user.id,
    contactId: payload.contactId || null,
    companyId: payload.companyId || null,
    dealId: payload.dealId || null,
    departmentId,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    priority: payload.priority || "Medium",
    status: "Pending",
  });

  if (payload.contactId) {
    await db.Activity.create({
      type: "task",
      title: `Task created: ${task.title}`,
      contactId: payload.contactId,
      dealId: payload.dealId || null,
      companyId: payload.companyId || null,
      userId: user.id,
      occurredAt: new Date(),
    });
  }

  await recordAudit({ userId: user.id, action: "Created task", module: "tasks", resourceType: "Task", resourceId: task.id });
  return task;
}

export async function updateTaskStatus(user, id, status) {
  requirePermission(user, "tasks.update");
  const task = await Task.findByPk(id);
  if (!task) throw new Error("Task not found.");
  await task.update({ status, completedAt: status === "Completed" ? new Date() : null });
  await recordAudit({ userId: user.id, action: `Task marked ${status}`, module: "tasks", resourceType: "Task", resourceId: id });
  return task;
}

export async function deleteTask(user, id) {
  requirePermission(user, "tasks.delete");
  await Task.destroy({ where: { id } });
  await recordAudit({ userId: user.id, action: "Deleted task", module: "tasks", resourceType: "Task", resourceId: id });
}
