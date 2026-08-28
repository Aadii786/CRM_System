"use strict";

const { PERMISSIONS } = require("../../constants/permissions");
const { ROLES } = require("../../constants/roles");
const { idMapByColumn } = require("./lib/lookup");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "permissions",
      PERMISSIONS.map((p) => ({
        key: p.key,
        module: p.module,
        description: p.description,
        created_at: now,
        updated_at: now,
      })),
      {}
    );

    await queryInterface.bulkInsert(
      "roles",
      ROLES.map((r) => ({
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

    const permissionIds = await idMapByColumn(queryInterface, "permissions", "key");
    const roleIds = await idMapByColumn(queryInterface, "roles", "key");

    const rolePermissionRows = [];
    for (const role of ROLES) {
      for (const permKey of role.permissions) {
        if (!permissionIds[permKey]) continue; // guards against typos in role catalogs
        rolePermissionRows.push({
          role_id: roleIds[role.key],
          permission_id: permissionIds[permKey],
          created_at: now,
          updated_at: now,
        });
      }
    }
    await queryInterface.bulkInsert("role_permissions", rolePermissionRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("role_permissions", null, {});
    await queryInterface.bulkDelete("roles", null, {});
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
