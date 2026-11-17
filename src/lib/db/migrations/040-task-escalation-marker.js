"use strict";

/** Marks tasks whose manager has already been told they are overdue (one digest notification, never per task). Idempotent. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const d = await queryInterface.describeTable("tasks");
    if (!d.escalated_at) await queryInterface.addColumn("tasks", "escalated_at", { type: Sequelize.DATE, allowNull: true });
  },
  async down(queryInterface) {
    const d = await queryInterface.describeTable("tasks");
    if (d.escalated_at) await queryInterface.removeColumn("tasks", "escalated_at");
  },
};
