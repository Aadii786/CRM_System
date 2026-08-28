"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("pipelines", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
        onDelete: "CASCADE",
      },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("pipeline_stages", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      pipeline_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "pipelines", key: "id" },
        onDelete: "CASCADE",
      },
      key: { type: Sequelize.STRING(60), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false },
      probability: { type: Sequelize.INTEGER, defaultValue: 10 },
      is_won: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_lost: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("pipeline_stages", ["pipeline_id", "key"], {
      unique: true,
      name: "pipeline_stages_pipeline_id_key_unique",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("pipeline_stages");
    await queryInterface.dropTable("pipelines");
  },
};
