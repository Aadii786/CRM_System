"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      job_title: Sequelize.STRING(150),
      avatar_color: { type: Sequelize.STRING(20), defaultValue: "#6366F1" },
      primary_role_key: Sequelize.STRING(60),
      department_id: {
        type: Sequelize.INTEGER,
        references: { model: "departments", key: "id" },
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("active", "disabled"),
        defaultValue: "active",
      },
      last_active_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: Sequelize.DATE,
    });
    await queryInterface.addIndex("users", ["department_id"]);
    await queryInterface.addIndex("users", ["email"]);

    await queryInterface.createTable("user_roles", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "roles", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("user_roles", ["user_id", "role_id"], {
      unique: true,
      name: "user_roles_user_id_role_id_unique",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("user_roles");
    await queryInterface.dropTable("users");
  },
};
