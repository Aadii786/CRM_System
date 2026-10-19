"use strict";

/**
 * Roles sheet (IKL): the sales side enters invoice and payment references.
 * IKL_HSM_EXECUTIVE had proposals.manage but not invoices.manage, so IKL's
 * business-development users could not record an invoice. Idempotent.
 */
module.exports = {
  async up(queryInterface) {
    const [[role]] = await queryInterface.sequelize.query("SELECT id FROM `roles` WHERE `key` = 'IKL_HSM_EXECUTIVE'");
    const [[perm]] = await queryInterface.sequelize.query("SELECT id FROM `permissions` WHERE `key` = 'invoices.manage'");
    if (!role || !perm) return;
    const [existing] = await queryInterface.sequelize.query("SELECT 1 FROM `role_permissions` WHERE role_id = :r AND permission_id = :p", { replacements: { r: role.id, p: perm.id } });
    if (existing.length) return;
    const now = new Date();
    await queryInterface.bulkInsert("role_permissions", [{ role_id: role.id, permission_id: perm.id, created_at: now, updated_at: now }]);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE rp FROM `role_permissions` rp JOIN `roles` r ON r.id = rp.role_id JOIN `permissions` p ON p.id = rp.permission_id WHERE r.`key` = 'IKL_HSM_EXECUTIVE' AND p.`key` = 'invoices.manage'"
    );
  },
};
