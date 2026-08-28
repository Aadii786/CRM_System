"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("automations", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: Sequelize.STRING(255),
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      status: {
        type: Sequelize.ENUM("Draft", "Active", "Paused", "Archived"),
        defaultValue: "Draft",
      },
      trigger_type: { type: Sequelize.STRING(60), allowNull: false },
      trigger_config: Sequelize.JSON,
      created_by: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      total_entered: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_active: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_completed: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_exited: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_converted: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("automation_nodes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      automation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "automations", key: "id" },
        onDelete: "CASCADE",
      },
      parent_id: Sequelize.INTEGER,
      branch: Sequelize.STRING(10),
      type: {
        type: Sequelize.ENUM("trigger", "condition", "action", "delay", "exit"),
        allowNull: false,
      },
      key: { type: Sequelize.STRING(60), allowNull: false },
      label: { type: Sequelize.STRING(150), allowNull: false },
      config: Sequelize.JSON,
      order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("automation_nodes", ["automation_id"]);

    await queryInterface.createTable("automation_executions", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      automation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "automations", key: "id" },
        onDelete: "CASCADE",
      },
      contact_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM("active", "completed", "exited"),
        defaultValue: "active",
      },
      current_node_id: Sequelize.INTEGER,
      started_at: { type: Sequelize.DATE, allowNull: false },
      completed_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("automation_executions", ["automation_id"]);
    await queryInterface.addIndex("automation_executions", ["contact_id"]);

    await queryInterface.createTable("automation_execution_logs", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      execution_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "automation_executions", key: "id" },
        onDelete: "CASCADE",
      },
      node_id: Sequelize.INTEGER,
      action: { type: Sequelize.STRING(150), allowNull: false },
      result: Sequelize.STRING(255),
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("automation_execution_logs");
    await queryInterface.dropTable("automation_executions");
    await queryInterface.dropTable("automation_nodes");
    await queryInterface.dropTable("automations");
  },
};
