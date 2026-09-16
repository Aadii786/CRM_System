"use strict";

const { ROLES } = require("../../constants/roles");

/**
 * CNM audit fix: the generic (non-pilot) department template only had
 * DEPARTMENT_HEAD and TEAM_MEMBER - a Department Head had no way to hand
 * out a Marketing-flavored vs. Sales-flavored role, only one undifferentiated
 * "Team Member". Adds DEPARTMENT_MARKETING and DEPARTMENT_SALES, the same
 * generic/any-department shape as DEPARTMENT_HEAD/TEAM_MEMBER (see
 * constants/roles.js) - both scope to the assignee's own departmentId like
 * every other role, so they share one department's Contact rows rather than
 * getting a separate dataset per role. Idempotent: safe to re-run.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const newRoleKeys = ["DEPARTMENT_MARKETING", "DEPARTMENT_SALES"];
    const [existingRoles] = await queryInterface.sequelize.query(
      `SELECT \`key\` FROM \`roles\` WHERE \`key\` IN (:keys)`,
      { replacements: { keys: newRoleKeys } }
    );
    const existingRoleKeys = new Set(existingRoles.map((r) => r.key));

    for (const roleDef of ROLES.filter((r) => newRoleKeys.includes(r.key))) {
      if (existingRoleKeys.has(roleDef.key)) continue;

      await queryInterface.bulkInsert("roles", [
        {
          key: roleDef.key,
          name: roleDef.name,
          description: roleDef.description,
          scope: roleDef.scope,
          is_system: true,
          created_at: now,
          updated_at: now,
        },
      ]);

      const [[{ id: roleId }]] = await queryInterface.sequelize.query(
        `SELECT id FROM \`roles\` WHERE \`key\` = :key`,
        { replacements: { key: roleDef.key } }
      );

      const [permissionRows] = await queryInterface.sequelize.query(
        `SELECT id, \`key\` FROM \`permissions\` WHERE \`key\` IN (:keys)`,
        { replacements: { keys: roleDef.permissions } }
      );
      const rolePermissionRows = permissionRows.map((p) => ({
        role_id: roleId,
        permission_id: p.id,
        created_at: now,
        updated_at: now,
      }));
      if (rolePermissionRows.length) {
        await queryInterface.bulkInsert("role_permissions", rolePermissionRows);
      }
    }
  },

  async down(queryInterface) {
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM \`roles\` WHERE \`key\` IN ('DEPARTMENT_MARKETING', 'DEPARTMENT_SALES')`
    );
    for (const r of roles) {
      await queryInterface.sequelize.query(`DELETE FROM \`role_permissions\` WHERE role_id = :id`, { replacements: { id: r.id } });
      await queryInterface.sequelize.query(`DELETE FROM \`roles\` WHERE id = :id`, { replacements: { id: r.id } });
    }
  },
};
