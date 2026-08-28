"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("integrations", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: {
        type: Sequelize.ENUM("native", "third_party", "api"),
        defaultValue: "third_party",
      },
      status: {
        type: Sequelize.ENUM("connected", "disconnected", "config_required"),
        defaultValue: "disconnected",
      },
      config: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("webhooks", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: false },
      events: Sequelize.JSON,
      status: { type: Sequelize.ENUM("active", "disabled"), defaultValue: "active" },
      secret_masked: Sequelize.STRING(60),
      last_triggered_at: Sequelize.DATE,
      last_status: Sequelize.STRING(20),
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable("api_keys", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      key_prefix: { type: Sequelize.STRING(20), allowNull: false },
      key_hash: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.ENUM("active", "revoked"), defaultValue: "active" },
      last_used_at: Sequelize.DATE,
      created_by: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("api_keys");
    await queryInterface.dropTable("webhooks");
    await queryInterface.dropTable("integrations");
  },
};
