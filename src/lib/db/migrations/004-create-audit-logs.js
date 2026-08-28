"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      action: { type: Sequelize.STRING(150), allowNull: false },
      module: { type: Sequelize.STRING(60), allowNull: false },
      resource_type: Sequelize.STRING(60),
      resource_id: Sequelize.STRING(60),
      department_id: Sequelize.INTEGER,
      metadata: Sequelize.JSON,
      result: {
        type: Sequelize.ENUM("success", "denied", "error"),
        defaultValue: "success",
      },
      ip_address: Sequelize.STRING(64),
      user_agent: Sequelize.STRING(255),
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["user_id"]);
    await queryInterface.addIndex("audit_logs", ["created_at"]);
    await queryInterface.addIndex("audit_logs", ["module"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
  },
};
