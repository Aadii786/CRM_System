import "server-only";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, ForbiddenError } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";
import { departmentIdsForKeys } from "./departmentService";

const { User, Role, Department, UserRole } = db;

// A department-scoped actor (Department Head) may only manage users within
// their own department (see NON_GLOBAL_ASSIGNABLE_ROLE_KEYS below for the
// matching role restriction). Only a university-wide user (Rector, Central
// CRM Administrator) reaches the unrestricted branch below.
function isGlobalUserManager(user) {
  return Boolean(user.department?.isUniversityWide);
}

export async function listUsers(user) {
  requirePermission(user, "users.view");
  const where = {};
  if (!isGlobalUserManager(user)) {
    if (!user.department) return [];
    const deptIds = await departmentIdsForKeys([user.department.key]);
    if (deptIds.length === 0) return [];
    where.departmentId = { [Op.in]: deptIds };
  }
  return User.findAll({
    where,
    include: [{ model: Department }, { model: Role }],
    order: [["name", "ASC"]],
  });
}

// A department-scoped Department Head can only ever hand new hires the
// generic, operational Team Member role - promoting someone to Department
// Head, or assigning any of the bespoke Marketing/IKL-HSM roles, stays a
// Super Admin action (Settings > Departments > Create Department / change
// head), matching the spec's hierarchy exactly.
const NON_GLOBAL_ASSIGNABLE_ROLE_KEYS = ["TEAM_MEMBER"];

/** Roles the current user is allowed to hand out - used to populate role pickers server-side, not just for display. */
export async function listAssignableRoles(user) {
  requirePermission(user, "users.manage");
  const where = isGlobalUserManager(user) ? {} : { key: { [Op.in]: NON_GLOBAL_ASSIGNABLE_ROLE_KEYS } };
  return Role.findAll({ where, order: [["name", "ASC"]] });
}

async function assertRoleAssignable(actingUser, roleKey) {
  const role = await Role.findOne({ where: { key: roleKey } });
  if (!role) throw new Error("Role not found.");
  if (!isGlobalUserManager(actingUser) && !NON_GLOBAL_ASSIGNABLE_ROLE_KEYS.includes(role.key)) {
    throw new ForbiddenError("You can only assign the Team Member role.");
  }
  return role;
}

export async function createUser(actingUser, payload) {
  requirePermission(actingUser, "users.manage");
  const role = await assertRoleAssignable(actingUser, payload.roleKey);

  // A department-scoped actor can only ever create users in their own
  // department - a client-supplied departmentId for any other department
  // is silently overridden, never trusted (requirements: prevent Department
  // Head A from creating a user under Department B).
  const departmentId = isGlobalUserManager(actingUser) ? payload.departmentId || null : actingUser.department.id;

  const passwordHash = await bcrypt.hash(payload.password || "Demo@12345", 10);
  const newUser = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    jobTitle: payload.jobTitle || null,
    primaryRoleKey: payload.roleKey,
    departmentId,
    status: "active",
  });

  await UserRole.create({ userId: newUser.id, roleId: role.id });

  await recordAudit({ userId: actingUser.id, action: `Created user ${payload.email}`, module: "users", resourceType: "User", resourceId: newUser.id, departmentId });
  return newUser;
}

async function loadTargetInOwnDepartment(actingUser, id) {
  const target = await User.findByPk(id, { include: [{ model: Department }] });
  if (!target) throw new Error("User not found.");
  if (!isGlobalUserManager(actingUser)) {
    requireDepartmentAccess(actingUser, target.Department?.key);
  }
  return target;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Update (the "U" in CRUD, alongside createUser/updateUserRole/
 * updateUserStatus): edits a user's own profile fields. Department and
 * role changes go through their dedicated, more tightly-guarded functions
 * above - this one deliberately can't touch either.
 */
export async function updateUserDetails(actingUser, id, { name, email, jobTitle }) {
  requirePermission(actingUser, "users.manage");
  const target = await loadTargetInOwnDepartment(actingUser, id);

  const cleanName = name?.trim();
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanName) throw new Error("Name is required.");
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) throw new Error("A valid email is required.");
  if (cleanEmail !== target.email) {
    const clash = await User.findOne({ where: { email: cleanEmail } });
    if (clash) throw new Error("Another user already has this email.");
  }

  await target.update({ name: cleanName, email: cleanEmail, jobTitle: jobTitle?.trim() || null });
  await recordAudit({ userId: actingUser.id, action: `Updated user ${target.email}`, module: "users", resourceType: "User", resourceId: id, departmentId: target.departmentId });
  return target;
}

/**
 * Delete (the "D" in CRUD) - also used to restore. A real destructive
 * delete would either be blocked by foreign keys (deals/tasks/campaigns/
 * audit logs the user created/owns) or silently orphan that historical
 * data, so "delete" here means fully revoking login access while keeping
 * every record they ever touched intact and correctly attributed -
 * reversible, matching this platform's own soft-delete convention (see
 * departmentService.setDepartmentStatus).
 */
export async function updateUserStatus(actingUser, id, status) {
  requirePermission(actingUser, "users.manage");
  const target = await loadTargetInOwnDepartment(actingUser, id);
  if (status === "disabled" && String(target.id) === String(actingUser.id)) {
    throw new Error("You can't delete your own account.");
  }
  await target.update({ status });
  await recordAudit({
    userId: actingUser.id,
    action: `${status === "disabled" ? "Deleted" : "Restored"} user ${target.email}`,
    module: "users",
    resourceType: "User",
    resourceId: id,
    departmentId: target.departmentId,
  });
  return target;
}

export async function updateUserRole(actingUser, id, roleKey) {
  requirePermission(actingUser, "users.manage");
  const target = await loadTargetInOwnDepartment(actingUser, id);
  const role = await assertRoleAssignable(actingUser, roleKey);

  await UserRole.destroy({ where: { userId: id } });
  await UserRole.create({ userId: id, roleId: role.id });
  await target.update({ primaryRoleKey: roleKey });

  await recordAudit({ userId: actingUser.id, action: `Changed role for ${target.email} to ${role.name}`, module: "users", resourceType: "User", resourceId: id, departmentId: target.departmentId });
  return target;
}
