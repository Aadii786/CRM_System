"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tasks", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: Sequelize.TEXT,
      owner_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
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
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      due_date: Sequelize.DATE,
      priority: {
        type: Sequelize.ENUM("Low", "Medium", "High", "Urgent"),
        defaultValue: "Medium",
      },
      status: {
        type: Sequelize.ENUM(
          "Pending",
          "In Progress",
          "Completed",
          "Overdue",
          "Cancelled"
        ),
        defaultValue: "Pending",
      },
      completed_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("tasks", ["owner_id"]);
    await queryInterface.addIndex("tasks", ["status"]);
    await queryInterface.addIndex("tasks", ["due_date"]);
    await queryInterface.addIndex("tasks", ["department_id"]);

    await queryInterface.createTable("meetings", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
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
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      owner_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      start_at: { type: Sequelize.DATE, allowNull: false },
      end_at: Sequelize.DATE,
      location: Sequelize.STRING(255),
      attendees: Sequelize.JSON,
      notes: Sequelize.TEXT,
      outcome: Sequelize.STRING(255),
      status: {
        type: Sequelize.ENUM("Scheduled", "Completed", "Cancelled"),
        defaultValue: "Scheduled",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("meetings", ["start_at"]);
    await queryInterface.addIndex("meetings", ["owner_id"]);

    await queryInterface.createTable("notes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      body: { type: Sequelize.TEXT, allowNull: false },
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
      author_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("notes");
    await queryInterface.dropTable("meetings");
    await queryInterface.dropTable("tasks");
  },
};
