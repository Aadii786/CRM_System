"use strict";

/** Contacts get a street address (IKL CRM Changes, 26 Nov 2026). Idempotent. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable("contacts");
    if (!t.address) await queryInterface.addColumn("contacts", "address", { type: Sequelize.STRING(255), allowNull: true });
  },
  async down(queryInterface) {
    const t = await queryInterface.describeTable("contacts");
    if (t.address) await queryInterface.removeColumn("contacts", "address");
  },
};
