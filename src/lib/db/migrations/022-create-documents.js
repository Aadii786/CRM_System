"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("documents", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: Sequelize.STRING(500),
      stored_file_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: Sequelize.STRING(100),
      file_size: Sequelize.INTEGER,
      related_type: {
        type: Sequelize.ENUM("contact", "company", "deal", "meeting"),
        allowNull: false,
      },
      related_id: { type: Sequelize.INTEGER, allowNull: false },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("documents", ["related_type", "related_id"]);
    await queryInterface.addIndex("documents", ["department_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("documents");
  },
};
