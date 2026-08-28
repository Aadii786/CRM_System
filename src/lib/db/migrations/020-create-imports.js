"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("imports", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      filename: { type: Sequelize.STRING(255), allowNull: false },
      uploaded_by: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      department_id: Sequelize.INTEGER,
      total_rows: { type: Sequelize.INTEGER, defaultValue: 0 },
      valid_rows: { type: Sequelize.INTEGER, defaultValue: 0 },
      duplicate_rows: { type: Sequelize.INTEGER, defaultValue: 0 },
      invalid_rows: { type: Sequelize.INTEGER, defaultValue: 0 },
      imported_rows: { type: Sequelize.INTEGER, defaultValue: 0 },
      field_mapping: Sequelize.JSON,
      status: {
        type: Sequelize.ENUM(
          "uploaded",
          "mapped",
          "validated",
          "importing",
          "completed",
          "failed"
        ),
        defaultValue: "uploaded",
      },
      started_at: Sequelize.DATE,
      completed_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("import_rows", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      import_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "imports", key: "id" },
        onDelete: "CASCADE",
      },
      row_number: { type: Sequelize.INTEGER, allowNull: false },
      data: Sequelize.JSON,
      status: {
        type: Sequelize.ENUM("valid", "duplicate", "invalid", "imported"),
        allowNull: false,
      },
      error_message: Sequelize.STRING(255),
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("import_rows", ["import_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("import_rows");
    await queryInterface.dropTable("imports");
  },
};
