import "server-only";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, hasPermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Department, User, Role, UserRole } = db;

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

function slugifyKey(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Department Creation Flow: Super Admin only (departments.manage). Creates
 * the department, then either promotes an existing user to Department Head
 * or creates a brand-new one - both are assigned the generic, reusable
 * DEPARTMENT_HEAD role (see constants/roles.js) so a new department needs
 * no hand-authored role, unlike the original Marketing/IKL-HSM pair.
 */
export async function createDepartment(actingUser, { name, key, description, headMode, existingHeadUserId, newHead }) {
  requirePermission(actingUser, "departments.manage");

  const cleanName = name?.trim();
  const cleanKey = slugifyKey(key);
  if (!cleanName) throw new Error("Department name is required.");
  if (!cleanKey) throw new Error("A department code is required.");
  if (await Department.findOne({ where: { key: cleanKey } })) {
    throw new Error(`Department code "${cleanKey}" is already in use.`);
  }

  const dept = await Department.create({
    key: cleanKey,
    name: cleanName,
    description: description || null,
    isUniversityWide: false,
    isActive: true,
  });
  await recordAudit({ userId: actingUser.id, action: `Created department "${cleanName}"`, module: "departments", resourceType: "Department", resourceId: dept.id, departmentId: dept.id });

  const headRole = await Role.findOne({ where: { key: "DEPARTMENT_HEAD" } });
  let headUser = null;

  if (headMode === "existing" && existingHeadUserId) {
    headUser = await User.findByPk(existingHeadUserId);
    if (!headUser) throw new Error("Selected department head user not found.");
    await headUser.update({ departmentId: dept.id, primaryRoleKey: "DEPARTMENT_HEAD" });
    if (headRole) {
      await UserRole.destroy({ where: { userId: headUser.id } });
      await UserRole.create({ userId: headUser.id, roleId: headRole.id });
    }
  } else if (headMode === "new" && newHead?.name && newHead?.email) {
    const passwordHash = await bcrypt.hash(newHead.password || "Demo@12345", 10);
    headUser = await User.create({
      name: newHead.name,
      email: newHead.email.toLowerCase(),
      passwordHash,
      primaryRoleKey: "DEPARTMENT_HEAD",
      departmentId: dept.id,
      status: "active",
    });
    if (headRole) await UserRole.create({ userId: headUser.id, roleId: headRole.id });
  }

  if (headUser) {
    await dept.update({ headUserId: headUser.id });
    await recordAudit({ userId: actingUser.id, action: `Assigned ${headUser.email} as head of "${cleanName}"`, module: "departments", resourceType: "Department", resourceId: dept.id, departmentId: dept.id });
  }

  return dept;
}

export async function updateDepartment(actingUser, id, { name, description }) {
  requirePermission(actingUser, "departments.manage");
  const dept = await Department.findByPk(id);
  if (!dept) throw new Error("Department not found.");
  const cleanName = name?.trim();
  if (!cleanName) throw new Error("Department name is required.");
  await dept.update({ name: cleanName, description: description ?? dept.description });
  await recordAudit({ userId: actingUser.id, action: `Updated department "${cleanName}"`, module: "departments", resourceType: "Department", resourceId: dept.id, departmentId: dept.id });
  return dept;
}

/** Re-assigns an existing department to a new head (must already belong to that department). */
export async function setDepartmentHead(actingUser, id, headUserId) {
  requirePermission(actingUser, "departments.manage");
  const dept = await Department.findByPk(id);
  if (!dept) throw new Error("Department not found.");
  const headUser = await User.findByPk(headUserId);
  if (!headUser || headUser.departmentId !== dept.id) {
    throw new Error("The department head must already belong to this department.");
  }
  await dept.update({ headUserId: headUser.id });
  await recordAudit({ userId: actingUser.id, action: `Assigned ${headUser.email} as head of "${dept.name}"`, module: "departments", resourceType: "Department", resourceId: dept.id, departmentId: dept.id });
  return dept;
}

/**
 * Soft deactivate/reactivate (requirement: preserve historical data, no
 * destructive delete). Deactivating blocks that department's own users
 * from logging in (authService.js) while Super Admin retains full
 * visibility. The university-wide executive scope can never be
 * deactivated - that would lock out the Rector and every administrator.
 */
export async function setDepartmentStatus(actingUser, id, isActive) {
  requirePermission(actingUser, "departments.manage");
  const dept = await Department.findByPk(id);
  if (!dept) throw new Error("Department not found.");
  if (dept.isUniversityWide) throw new Error("The university-wide executive scope can't be deactivated.");
  await dept.update({ isActive });
  await recordAudit({
    userId: actingUser.id,
    action: `${isActive ? "Reactivated" : "Deactivated"} department "${dept.name}"`,
    module: "departments",
    resourceType: "Department",
    resourceId: dept.id,
    departmentId: dept.id,
  });
  return dept;
}
