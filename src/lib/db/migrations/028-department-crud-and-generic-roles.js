"use strict";

const { ROLES } = require("../../constants/roles");

/**
 * Multi-department architecture backfill:
 *  1. departments.head_user_id - the user who heads each department.
 *  2. Two generic, department-agnostic role templates (DEPARTMENT_HEAD,
 *     TEAM_MEMBER) so a department created after this migration doesn't
 *     need hand-authored roles the way Marketing/IKL-HSM's original six
 *     roles were - see constants/roles.js.
 * Idempotent: safe to re-run against an already-seeded database.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("departments");
    if (!table.head_user_id) {
      await queryInterface.addColumn("departments", "head_user_id", { type: Sequelize.INTEGER, allowNull: true });
    }

    const now = new Date();
    const newRoleKeys = ["DEPARTMENT_HEAD", "TEAM_MEMBER"];
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
    const table = await queryInterface.describeTable("departments");
    if (table.head_user_id) await queryInterface.removeColumn("departments", "head_user_id");

    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM \`roles\` WHERE \`key\` IN ('DEPARTMENT_HEAD', 'TEAM_MEMBER')`
    );
    for (const r of roles) {
      await queryInterface.sequelize.query(`DELETE FROM \`role_permissions\` WHERE role_id = :id`, { replacements: { id: r.id } });
      await queryInterface.sequelize.query(`DELETE FROM \`roles\` WHERE id = :id`, { replacements: { id: r.id } });
    }
  },
};
