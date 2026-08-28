"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING(60), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      body: Sequelize.STRING(500),
      link: Sequelize.STRING(255),
      is_read: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("notifications", ["user_id", "is_read"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};
