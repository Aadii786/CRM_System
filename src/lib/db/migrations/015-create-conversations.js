"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("conversations", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contact_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      channel: { type: Sequelize.STRING(30), defaultValue: "whatsapp" },
      status: {
        type: Sequelize.ENUM("open", "assigned", "closed"),
        defaultValue: "open",
      },
      assigned_to: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      department_id: {
        type: Sequelize.INTEGER,
        references: { model: "departments", key: "id" },
        onDelete: "SET NULL",
      },
      last_message_at: Sequelize.DATE,
      last_message_preview: Sequelize.STRING(255),
      unread_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("conversations", ["assigned_to"]);
    await queryInterface.addIndex("conversations", ["status"]);

    await queryInterface.createTable("messages", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "conversations", key: "id" },
        onDelete: "CASCADE",
      },
      direction: {
        type: Sequelize.ENUM("inbound", "outbound"),
        allowNull: false,
      },
      sender_type: {
        type: Sequelize.ENUM("contact", "user", "system"),
        allowNull: false,
      },
      sender_id: Sequelize.INTEGER,
      body: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM("sent", "delivered", "read", "failed"),
        defaultValue: "sent",
      },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("messages", ["conversation_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("messages");
    await queryInterface.dropTable("conversations");
  },
};
