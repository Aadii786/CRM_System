"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("permissions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      module: { type: Sequelize.STRING(60), allowNull: false },
      description: Sequelize.STRING(255),
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("roles", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      description: Sequelize.STRING(255),
      scope: { type: Sequelize.STRING(30), defaultValue: "university" },
      is_system: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("role_permissions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "roles", key: "id" },
        onDelete: "CASCADE",
      },
      permission_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "permissions", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("role_permissions", ["role_id", "permission_id"], {
      unique: true,
      name: "role_permissions_role_id_permission_id_unique",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("role_permissions");
    await queryInterface.dropTable("roles");
    await queryInterface.dropTable("permissions");
  },
};
