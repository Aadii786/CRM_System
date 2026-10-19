"use strict";

/**
 * Sprint 1 (IKL): proposals get a title, an approval step (Draft -> pending ->
 * approved / rejected by the department head) and an audit of who created /
 * approved them. Also grants the generic department roles the permissions the
 * agreed Roles sheet describes (proposals + invoice references for Head and
 * Sales; sending, automations and exports for Marketing; ...). Idempotent.
 */
const GRANTS = {
  DEPARTMENT_HEAD: ["proposals.manage", "invoices.manage", "training.manage"],
  DEPARTMENT_SALES: ["proposals.manage", "invoices.manage", "training.manage", "lists.update", "segments.view", "campaigns.view", "automations.view"],
  DEPARTMENT_MARKETING: [
    "campaigns.send", "automations.create", "automations.update", "automations.execute",
    "contacts.export", "reports.export", "companies.view", "deals.view",
    "segments.update", "lists.update",
  ],
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("proposals");
    const add = async (name, def) => { if (!table[name]) await queryInterface.addColumn("proposals", name, def); };
    await add("title", { type: Sequelize.STRING(200), allowNull: true });
    await add("approval_status", { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Not submitted" });
    await add("approved_by_id", { type: Sequelize.INTEGER, allowNull: true });
    await add("approved_at", { type: Sequelize.DATE, allowNull: true });
    await add("rejection_reason", { type: Sequelize.STRING(500), allowNull: true });
    await add("created_by_id", { type: Sequelize.INTEGER, allowNull: true });

    // Proposals that were already sent/accepted before this step existed count as approved.
    await queryInterface.sequelize.query("UPDATE `proposals` SET approval_status = 'Approved' WHERE status IN ('Sent','Accepted') AND approval_status = 'Not submitted'");

    const now = new Date();
    for (const [roleKey, permKeys] of Object.entries(GRANTS)) {
      const [[role]] = await queryInterface.sequelize.query("SELECT id FROM `roles` WHERE `key` = :k", { replacements: { k: roleKey } });
      if (!role) continue;
      const [perms] = await queryInterface.sequelize.query("SELECT id, `key` FROM `permissions` WHERE `key` IN (:keys)", { replacements: { keys: permKeys } });
      const [existing] = await queryInterface.sequelize.query("SELECT permission_id FROM `role_permissions` WHERE role_id = :id", { replacements: { id: role.id } });
      const have = new Set(existing.map((e) => e.permission_id));
      const rows = perms.filter((p) => !have.has(p.id)).map((p) => ({ role_id: role.id, permission_id: p.id, created_at: now, updated_at: now }));
      if (rows.length) await queryInterface.bulkInsert("role_permissions", rows);
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("proposals");
    for (const c of ["title", "approval_status", "approved_by_id", "approved_at", "rejection_reason", "created_by_id"]) {
      if (table[c]) await queryInterface.removeColumn("proposals", c);
    }
  },
};
