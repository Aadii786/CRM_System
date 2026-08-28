"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("custom_fields", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      entity_type: {
        type: Sequelize.ENUM("contact", "company", "deal"),
        allowNull: false,
      },
      key: { type: Sequelize.STRING(80), allowNull: false },
      label: { type: Sequelize.STRING(150), allowNull: false },
      field_type: {
        type: Sequelize.ENUM(
          "text",
          "number",
          "date",
          "boolean",
          "select",
          "multiselect"
        ),
        defaultValue: "text",
      },
      options: Sequelize.JSON,
      is_required: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("custom_fields", ["entity_type", "key"], {
      unique: true,
      name: "custom_fields_entity_type_key_unique",
    });

    await queryInterface.createTable("custom_objects", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: Sequelize.STRING(255),
      schema: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("custom_object_records", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      custom_object_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "custom_objects", key: "id" },
        onDelete: "CASCADE",
      },
      related_type: Sequelize.STRING(60),
      related_id: Sequelize.INTEGER,
      data: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("settings", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      category: { type: Sequelize.STRING(60), allowNull: false },
      key: { type: Sequelize.STRING(100), allowNull: false },
      value: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("settings", ["category", "key"], {
      unique: true,
      name: "settings_category_key_unique",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("settings");
    await queryInterface.dropTable("custom_object_records");
    await queryInterface.dropTable("custom_objects");
    await queryInterface.dropTable("custom_fields");
  },
};
