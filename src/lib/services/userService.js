import "server-only";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { User, Role, Department, UserRole } = db;

export async function listUsers(user) {
  requirePermission(user, "users.view");
  return User.findAll({
    include: [{ model: Department }, { model: Role }],
    order: [["name", "ASC"]],
  });
}

export async function createUser(actingUser, payload) {
  requirePermission(actingUser, "users.manage");
  const passwordHash = await bcrypt.hash(payload.password || "Demo@12345", 10);

  const newUser = await User.create({
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    jobTitle: payload.jobTitle || null,
    primaryRoleKey: payload.roleKey,
    departmentId: payload.departmentId || null,
    status: "active",
  });

  const role = await Role.findOne({ where: { key: payload.roleKey } });
  if (role) await UserRole.create({ userId: newUser.id, roleId: role.id });

  await recordAudit({ userId: actingUser.id, action: `Created user ${payload.email}`, module: "users", resourceType: "User", resourceId: newUser.id });
  return newUser;
}

export async function updateUserStatus(actingUser, id, status) {
  requirePermission(actingUser, "users.manage");
  const target = await User.findByPk(id);
  if (!target) throw new Error("User not found.");
  await target.update({ status });
  await recordAudit({ userId: actingUser.id, action: `User ${status === "disabled" ? "disabled" : "enabled"}: ${target.email}`, module: "users", resourceType: "User", resourceId: id });
  return target;
}

export async function updateUserRole(actingUser, id, roleKey) {
  requirePermission(actingUser, "users.manage");
  const target = await User.findByPk(id);
  if (!target) throw new Error("User not found.");
  const role = await Role.findOne({ where: { key: roleKey } });
  if (!role) throw new Error("Role not found.");

  await UserRole.destroy({ where: { userId: id } });
  await UserRole.create({ userId: id, roleId: role.id });
  await target.update({ primaryRoleKey: roleKey });

  await recordAudit({ userId: actingUser.id, action: `Changed role for ${target.email} to ${role.name}`, module: "users", resourceType: "User", resourceId: id });
  return target;
}
