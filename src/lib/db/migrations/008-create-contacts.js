"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("contacts", {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(190), allowNull: false },
      phone: Sequelize.STRING(40),
      whatsapp_number: Sequelize.STRING(40),
      job_title: Sequelize.STRING(150),
      city: Sequelize.STRING(100),
      country: { type: Sequelize.STRING(100), defaultValue: "Pakistan" },
      company_id: {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" },
        onDelete: "SET NULL",
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "departments", key: "id" },
      },
      owner_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      source: { type: Sequelize.STRING(40), defaultValue: "Other" },
      status: {
        type: Sequelize.ENUM(
          "New",
          "Engaged",
          "Interested",
          "Qualified",
          "Inactive",
          "Converted",
          "Unsubscribed",
          "Bounced"
        ),
        defaultValue: "New",
      },
      engagement_status: {
        type: Sequelize.ENUM(
          "Delivered",
          "Opened",
          "Clicked",
          "Bounced",
          "Unsubscribed",
          "Engaged",
          "Inactive"
        ),
        defaultValue: "Inactive",
      },
      lead_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      last_activity_at: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: Sequelize.DATE,
    });
    await queryInterface.addIndex("contacts", ["email"]);
    await queryInterface.addIndex("contacts", ["phone"]);
    await queryInterface.addIndex("contacts", ["status"]);
    await queryInterface.addIndex("contacts", ["department_id"]);
    await queryInterface.addIndex("contacts", ["owner_id"]);
    await queryInterface.addIndex("contacts", ["company_id"]);
    await queryInterface.addIndex("contacts", ["lead_score"]);
    await queryInterface.addIndex("contacts", ["created_at"]);
    await queryInterface.addIndex("contacts", ["updated_at"]);
    await queryInterface.addIndex("contacts", ["source"]);
    await queryInterface.addIndex("contacts", ["engagement_status"]);

    await queryInterface.createTable("contact_tags", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      contact_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: "contacts", key: "id" },
        onDelete: "CASCADE",
      },
      tag_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "tags", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("contact_tags", ["contact_id", "tag_id"], {
      unique: true,
      name: "contact_tags_contact_id_tag_id_unique",
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("contact_tags");
    await queryInterface.dropTable("contacts");
  },
};
