"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("activities", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      type: {
        type: Sequelize.ENUM(
          "email",
          "whatsapp",
          "call",
          "meeting",
          "note",
          "task",
          "campaign",
          "automation",
          "deal_stage",
          "proposal",
          "payment",
          "status_change",
          "lead_score",
          "import",
          "system"
        ),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: Sequelize.TEXT,
      contact_id: {
        type: Sequelize.BIGINT,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      company_id: {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" },
        onDelete: "CASCADE",
      },
      deal_id: {
        type: Sequelize.INTEGER,
        references: { model: "deals", key: "id" },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      metadata: Sequelize.JSON,
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("activities", ["contact_id"]);
    await queryInterface.addIndex("activities", ["company_id"]);
    await queryInterface.addIndex("activities", ["deal_id"]);
    await queryInterface.addIndex("activities", ["occurred_at"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("activities");
  },
};
