"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("segments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: Sequelize.STRING(255),
      type: {
        type: Sequelize.ENUM("static", "dynamic"),
        defaultValue: "dynamic",
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      created_by: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      contact_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("segment_conditions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      segment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "segments", key: "id" },
        onDelete: "CASCADE",
      },
      field: { type: Sequelize.STRING(60), allowNull: false },
      operator: { type: Sequelize.STRING(30), allowNull: false },
      value: Sequelize.STRING(255),
      group_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("segment_conditions");
    await queryInterface.dropTable("segments");
  },
};
