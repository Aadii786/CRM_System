import "server-only";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Role, Permission, RolePermission } = db;

export async function listRolesWithPermissions(user) {
  requirePermission(user, "roles.view");
  return Role.findAll({
    include: [{ model: Permission, attributes: ["id", "key", "module"] }],
    order: [["id", "ASC"]],
  });
}

export async function listAllPermissions(user) {
  requirePermission(user, "roles.view");
  return Permission.findAll({ order: [["module", "ASC"], ["key", "ASC"]] });
}

/** Toggles one permission on/off for a role (requirements #44). */
export async function toggleRolePermission(actingUser, roleId, permissionId, enabled) {
  requirePermission(actingUser, "roles.manage");
  const role = await Role.findByPk(roleId);
  if (!role) throw new Error("Role not found.");

  if (role.isSystem && role.key === "CENTRAL_CRM_ADMINISTRATOR") {
    throw new Error("The Central CRM Administrator role always retains full access.");
  }

  if (enabled) {
    await RolePermission.findOrCreate({ where: { roleId, permissionId } });
  } else {
    await RolePermission.destroy({ where: { roleId, permissionId } });
  }

  await recordAudit({
    userId: actingUser.id,
    action: `${enabled ? "Granted" : "Revoked"} permission ${permissionId} for role "${role.name}"`,
    module: "roles",
    resourceType: "Role",
    resourceId: roleId,
  });
}
