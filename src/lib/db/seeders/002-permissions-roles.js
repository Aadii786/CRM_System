"use strict";

const { PERMISSIONS } = require("../../constants/permissions");
const { ROLES } = require("../../constants/roles");
const { idMapByColumn } = require("./lib/lookup");

// Idempotent on purpose: later migrations (025, 028, 032, 033, 035 ...) insert
// their own permissions, roles and grants, so on a database built with
// "migrate, then seed" those rows already exist. Only what is missing is added.
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existingPermissions = await idMapByColumn(queryInterface, "permissions", "key");
    const newPermissions = PERMISSIONS.filter((p) => !existingPermissions[p.key]);
    if (newPermissions.length) {
      await queryInterface.bulkInsert(
        "permissions",
        newPermissions.map((p) => ({
          key: p.key,
          module: p.module,
          description: p.description,
          created_at: now,
          updated_at: now,
        })),
        {}
      );
    }

    const existingRoles = await idMapByColumn(queryInterface, "roles", "key");
    const newRoles = ROLES.filter((r) => !existingRoles[r.key]);
    if (newRoles.length) {
      await queryInterface.bulkInsert(
        "roles",
        newRoles.map((r) => ({
          key: r.key,
          name: r.name,
          description: r.description,
          scope: r.scope,
          is_system: true,
          created_at: now,
          updated_at: now,
        })),
        {}
      );
    }

    const permissionIds = await idMapByColumn(queryInterface, "permissions", "key");
    const roleIds = await idMapByColumn(queryInterface, "roles", "key");

    const [existingGrants] = await queryInterface.sequelize.query(
      "SELECT role_id, permission_id FROM role_permissions"
    );
    const granted = new Set(existingGrants.map((g) => `${g.role_id}:${g.permission_id}`));

    const rolePermissionRows = [];
    for (const role of ROLES) {
      for (const permKey of role.permissions) {
        if (!permissionIds[permKey]) continue; // guards against typos in role catalogs
        const pair = `${roleIds[role.key]}:${permissionIds[permKey]}`;
        if (granted.has(pair)) continue;
        granted.add(pair);
        rolePermissionRows.push({
          role_id: roleIds[role.key],
          permission_id: permissionIds[permKey],
          created_at: now,
          updated_at: now,
        });
      }
    }
    if (rolePermissionRows.length) {
      await queryInterface.bulkInsert("role_permissions", rolePermissionRows, {});
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("role_permissions", null, {});
    await queryInterface.bulkDelete("roles", null, {});
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
