"use strict";

const { ROLES } = require("../../constants/roles");

const TARGET_ROLE_KEYS = ["IKL_HSM_MANAGER", "IKL_HSM_EXECUTIVE"];

/**
 * IKL/HSM manages the Companies module (B2B), so the Company -> Folder ->
 * List hierarchy is squarely theirs too - migration 029 only granted
 * lists.* to Marketing and the generic Department Head/Team Member roles.
 * Idempotent backfill, safe to re-run.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [permRows] = await queryInterface.sequelize.query(
      `SELECT id, \`key\` FROM \`permissions\` WHERE \`key\` LIKE 'lists.%'`
    );
    const permIdByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

    for (const roleKey of TARGET_ROLE_KEYS) {
      const roleDef = ROLES.find((r) => r.key === roleKey);
      if (!roleDef) continue;
      const [[roleRow]] = await queryInterface.sequelize.query(`SELECT id FROM \`roles\` WHERE \`key\` = :key`, { replacements: { key: roleKey } });
      if (!roleRow) continue;

      const grantKeys = roleDef.permissions.filter((k) => k.startsWith("lists."));
      for (const permKey of grantKeys) {
        const permId = permIdByKey[permKey];
        if (!permId) continue;
        const [already] = await queryInterface.sequelize.query(
          `SELECT id FROM \`role_permissions\` WHERE role_id = :roleId AND permission_id = :permId`,
          { replacements: { roleId: roleRow.id, permId } }
        );
        if (already.length) continue;
        await queryInterface.bulkInsert("role_permissions", [{ role_id: roleRow.id, permission_id: permId, created_at: now, updated_at: now }]);
      }
    }
  },

  async down(queryInterface) {
    const [permRows] = await queryInterface.sequelize.query(`SELECT id FROM \`permissions\` WHERE \`key\` LIKE 'lists.%'`);
    const permIds = permRows.map((p) => p.id);
    if (!permIds.length) return;
    for (const roleKey of TARGET_ROLE_KEYS) {
      const [[roleRow]] = await queryInterface.sequelize.query(`SELECT id FROM \`roles\` WHERE \`key\` = :key`, { replacements: { key: roleKey } });
      if (!roleRow) continue;
      await queryInterface.sequelize.query(
        `DELETE FROM \`role_permissions\` WHERE role_id = :roleId AND permission_id IN (:permIds)`,
        { replacements: { roleId: roleRow.id, permIds } }
      );
    }
  },
};
