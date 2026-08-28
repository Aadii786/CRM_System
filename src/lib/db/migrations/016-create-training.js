"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trainers", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      email: Sequelize.STRING(190),
      phone: Sequelize.STRING(40),
      specialization: Sequelize.STRING(150),
      remuneration_rate: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      status: {
        type: Sequelize.ENUM("Active", "Inactive"),
        defaultValue: "Active",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("training_programs", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      deal_id: {
        type: Sequelize.INTEGER,
        references: { model: "deals", key: "id" },
        onDelete: "SET NULL",
      },
      company_id: {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" },
        onDelete: "SET NULL",
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      training_type: {
        type: Sequelize.ENUM("ODC", "OB", "OEP", "CP", "Consultancy"),
        allowNull: false,
      },
      trainer_id: {
        type: Sequelize.INTEGER,
        references: { model: "trainers", key: "id" },
        onDelete: "SET NULL",
      },
      start_date: Sequelize.DATEONLY,
      end_date: Sequelize.DATEONLY,
      location: Sequelize.STRING(255),
      status: {
        type: Sequelize.ENUM("Planned", "In Progress", "Completed", "Cancelled"),
        defaultValue: "Planned",
      },
      participants_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      cost: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      feedback_score: Sequelize.DECIMAL(3, 2),
      feedback_notes: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("tnas", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      deal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "deals", key: "id" },
        onDelete: "CASCADE",
      },
      requirement: { type: Sequelize.TEXT, allowNull: false },
      assessment: Sequelize.TEXT,
      status: {
        type: Sequelize.ENUM("Pending", "In Progress", "Completed"),
        defaultValue: "Pending",
      },
      responsible_person: Sequelize.STRING(150),
      notes: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("proposals", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      deal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "deals", key: "id" },
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.ENUM("Initial", "Final"), defaultValue: "Initial" },
      value: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      sent_date: Sequelize.DATEONLY,
      status: {
        type: Sequelize.ENUM("Draft", "Sent", "Accepted", "Rejected"),
        defaultValue: "Draft",
      },
      notes: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("participants", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      training_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "training_programs", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      designation: Sequelize.STRING(150),
      organization: Sequelize.STRING(200),
      email: Sequelize.STRING(190),
      phone: Sequelize.STRING(40),
      attendance: {
        type: Sequelize.ENUM("Registered", "Attended", "No Show"),
        defaultValue: "Registered",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("participants");
    await queryInterface.dropTable("proposals");
    await queryInterface.dropTable("tnas");
    await queryInterface.dropTable("training_programs");
    await queryInterface.dropTable("trainers");
  },
};
