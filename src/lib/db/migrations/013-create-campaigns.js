"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("campaigns", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      subject: Sequelize.STRING(255),
      sender_name: Sequelize.STRING(150),
      sender_email: Sequelize.STRING(190),
      reply_to: Sequelize.STRING(190),
      body_html: Sequelize.TEXT("long"),
      segment_id: {
        type: Sequelize.INTEGER,
        references: { model: "segments", key: "id" },
        onDelete: "SET NULL",
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
      status: {
        type: Sequelize.ENUM(
          "Draft",
          "Scheduled",
          "Sending",
          "Sent",
          "Paused",
          "Failed"
        ),
        defaultValue: "Draft",
      },
      scheduled_at: Sequelize.DATE,
      sent_at: Sequelize.DATE,
      recipients_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      delivered_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      opened_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      clicked_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      bounced_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      unsubscribed_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("campaigns", ["status"]);
    await queryInterface.addIndex("campaigns", ["created_at"]);
    await queryInterface.addIndex("campaigns", ["department_id"]);

    await queryInterface.createTable("campaign_recipients", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "campaigns", key: "id" },
        onDelete: "CASCADE",
      },
      contact_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM(
          "queued",
          "sent",
          "delivered",
          "opened",
          "clicked",
          "bounced",
          "unsubscribed"
        ),
        defaultValue: "queued",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      "campaign_recipients",
      ["campaign_id", "contact_id"],
      { unique: true, name: "campaign_recipients_campaign_id_contact_id_unique" }
    );

    await queryInterface.createTable("campaign_events", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "campaigns", key: "id" },
        onDelete: "CASCADE",
      },
      contact_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM(
          "sent",
          "delivered",
          "opened",
          "clicked",
          "bounced",
          "unsubscribed"
        ),
        allowNull: false,
      },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      metadata: Sequelize.JSON,
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("campaign_events", ["campaign_id"]);
    await queryInterface.addIndex("campaign_events", ["type"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("campaign_events");
    await queryInterface.dropTable("campaign_recipients");
    await queryInterface.dropTable("campaigns");
  },
};
