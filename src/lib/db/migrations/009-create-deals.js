"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("deals", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      pipeline_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "pipelines", key: "id" },
      },
      stage_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "pipeline_stages", key: "id" },
      },
      company_id: {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" },
        onDelete: "SET NULL",
      },
      contact_id: {
        type: Sequelize.BIGINT,
        references: { model: "contacts", key: "id" },
        onDelete: "SET NULL",
      },
      owner_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      value: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      probability: { type: Sequelize.INTEGER, defaultValue: 10 },
      expected_close_date: Sequelize.DATEONLY,
      closed_at: Sequelize.DATE,
      source: { type: Sequelize.STRING(40), defaultValue: "Other" },
      training_type: Sequelize.ENUM("ODC", "OB", "OEP", "CP", "Consultancy"),
      status: {
        type: Sequelize.ENUM("open", "won", "lost"),
        defaultValue: "open",
      },
      last_activity_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: Sequelize.DATE,
    });
    await queryInterface.addIndex("deals", ["stage_id"]);
    await queryInterface.addIndex("deals", ["owner_id"]);
    await queryInterface.addIndex("deals", ["company_id"]);
    await queryInterface.addIndex("deals", ["pipeline_id"]);
    await queryInterface.addIndex("deals", ["department_id"]);
    await queryInterface.addIndex("deals", ["created_at"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("deals");
  },
};
