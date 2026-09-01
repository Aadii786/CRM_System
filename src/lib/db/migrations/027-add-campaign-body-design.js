"use strict";

/**
 * Stores the drag-and-drop email builder's element tree (positions, sizes,
 * per-element content/styling) so a campaign can be re-opened and edited
 * visually, not just as flattened HTML. `body_html` remains the rendered
 * snapshot used for preview/detail display and stays populated even for
 * campaigns created before this column existed.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("campaigns");
    if (!table.body_design) {
      await queryInterface.addColumn("campaigns", "body_design", { type: Sequelize.JSON, allowNull: true });
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable("campaigns");
    if (table.body_design) await queryInterface.removeColumn("campaigns", "body_design");
  },
};
