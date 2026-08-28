"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("companies", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      organization_type: {
        type: Sequelize.ENUM(
          "Corporate",
          "Government",
          "University",
          "Training Organization",
          "NGO",
          "Other"
        ),
        defaultValue: "Corporate",
      },
      industry: Sequelize.STRING(120),
      website: Sequelize.STRING(255),
      phone: Sequelize.STRING(40),
      email: Sequelize.STRING(190),
      address: Sequelize.STRING(255),
      city: Sequelize.STRING(100),
      country: { type: Sequelize.STRING(100), defaultValue: "Pakistan" },
      lead_source: { type: Sequelize.STRING(40), defaultValue: "Other" },
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
      status: {
        type: Sequelize.ENUM("Active", "Inactive", "Prospect"),
        defaultValue: "Prospect",
      },
      revenue: { type: Sequelize.DECIMAL(14, 2), defaultValue: 0 },
      last_activity_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: Sequelize.DATE,
    });
    await queryInterface.addIndex("companies", ["department_id"]);
    await queryInterface.addIndex("companies", ["name"]);
    await queryInterface.addIndex("companies", ["owner_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("companies");
  },
};
