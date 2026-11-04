"use strict";

/** Imports can now be contacts or companies (Sprint 2); old rows are contacts. Idempotent. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const d = await queryInterface.describeTable("imports");
    if (!d.entity) {
      await queryInterface.addColumn("imports", "entity", { type: Sequelize.STRING(20), allowNull: false, defaultValue: "contacts" });
    }
  },
  async down(queryInterface) {
    const d = await queryInterface.describeTable("imports");
    if (d.entity) await queryInterface.removeColumn("imports", "entity");
  },
};
