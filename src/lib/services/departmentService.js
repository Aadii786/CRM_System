import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, hasPermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Department } = db;

export async function listDepartments() {
  return Department.findAll({ order: [["id", "ASC"]] });
}

export async function departmentByKey(key) {
  return Department.findOne({ where: { key } });
}

/** Resolves department keys (e.g. ["marketing", "ikl-hsm"]) to numeric ids. */
export async function departmentIdsForKeys(keys = []) {
  if (!keys.length) return [];
  const rows = await Department.findAll({ where: { key: { [Op.in]: keys } }, attributes: ["id"] });
  return rows.map((r) => r.id);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Each department (Marketing, IKL/HSM, and any future department) sends
 * campaigns from its own identity. Anyone who can create campaigns for a
 * department can set that one department's sender identity themselves - a
 * Central CRM Administrator (departments.manage) can set any of them.
 */
export async function updateDepartmentSenderIdentity(user, departmentId, { senderName, senderEmail, replyTo }) {
  const dept = await Department.findByPk(departmentId);
  if (!dept) throw new Error("Department not found.");

  if (!hasPermission(user, "departments.manage")) {
    requirePermission(user, "campaigns.create");
    requireDepartmentAccess(user, dept.key);
  }

  const cleanName = senderName?.trim();
  const cleanEmail = senderEmail?.trim();
  const cleanReplyTo = (replyTo?.trim() || cleanEmail);
  if (!cleanName) throw new Error("Sender name is required.");
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) throw new Error("A valid sender email is required.");
  if (!EMAIL_RE.test(cleanReplyTo)) throw new Error("Reply-to must be a valid email address.");

  await dept.update({ senderName: cleanName, senderEmail: cleanEmail, replyTo: cleanReplyTo });
  await recordAudit({
    userId: user.id,
    action: "Updated department sender identity",
    module: "settings",
    resourceType: "Department",
    resourceId: dept.id,
    departmentId: dept.id,
  });
  return dept;
}
