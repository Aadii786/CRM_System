"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("invoices", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      deal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "deals", key: "id" },
        onDelete: "CASCADE",
      },
      proposal_id: {
        type: Sequelize.INTEGER,
        references: { model: "proposals", key: "id" },
        onDelete: "SET NULL",
      },
      invoice_number: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      paid_amount: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      status: {
        type: Sequelize.ENUM("Unpaid", "Partial", "Paid", "Overdue"),
        defaultValue: "Unpaid",
      },
      issue_date: Sequelize.DATEONLY,
      due_date: Sequelize.DATEONLY,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("invoices", ["status"]);
    await queryInterface.addIndex("invoices", ["deal_id"]);

    await queryInterface.createTable("payments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "invoices", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
      method: { type: Sequelize.STRING(60), defaultValue: "Bank Transfer" },
      reference: Sequelize.STRING(150),
      paid_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("trainer_remunerations", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      training_program_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "training_programs", key: "id" },
        onDelete: "CASCADE",
      },
      trainer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "trainers", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: { type: Sequelize.ENUM("Pending", "Paid"), defaultValue: "Pending" },
      paid_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("trainer_remunerations");
    await queryInterface.dropTable("payments");
    await queryInterface.dropTable("invoices");
  },
};
