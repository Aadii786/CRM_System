"use strict";

// Core Contact model. Designed to scale to ~58,000+ rows (requirements #16-#17):
// heavy fields are indexed (see migration 002) and the UI must always
// paginate through contactService rather than loading full result sets.
module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define(
    "Contact",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      firstName: { type: DataTypes.STRING(100), allowNull: false },
      lastName: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(190), allowNull: false },
      phone: DataTypes.STRING(40),
      whatsappNumber: DataTypes.STRING(40),
      landlineNumber: DataTypes.STRING(40),
      // Brevo-style external system id, for de-duplicating contacts on
      // re-import from a source system - not enforced unique, since the
      // same contact can legitimately carry different ids across imports.
      externalId: DataTypes.STRING(190),
      linkedin: DataTypes.STRING(255),
      timezone: DataTypes.STRING(60),
      detectedLanguage: DataTypes.STRING(10),
      doubleOptIn: { type: DataTypes.ENUM("Yes", "No"), defaultValue: "No" },
      optIn: { type: DataTypes.ENUM("Opted In", "Opted Out", "Unknown"), defaultValue: "Unknown" },
      jobTitle: DataTypes.STRING(150),
      city: DataTypes.STRING(100),
      country: { type: DataTypes.STRING(100), defaultValue: "Pakistan" },
      companyId: DataTypes.INTEGER,
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      ownerId: DataTypes.INTEGER,
      source: { type: DataTypes.STRING(40), defaultValue: "Other" },
      status: {
        type: DataTypes.ENUM(
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
      engagementStatus: {
        type: DataTypes.ENUM(
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
      leadScore: { type: DataTypes.INTEGER, defaultValue: 0 },
      lastActivityAt: DataTypes.DATE,
      deletedAt: DataTypes.DATE,
    },
    {
      tableName: "contacts",
      paranoid: true,
    }
  );

  Contact.associate = (models) => {
    Contact.belongsTo(models.Company, { foreignKey: "companyId" });
    Contact.belongsTo(models.Department, { foreignKey: "departmentId" });
    Contact.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Contact.belongsToMany(models.Tag, {
      through: models.ContactTag,
      foreignKey: "contactId",
      otherKey: "tagId",
    });
    Contact.hasMany(models.Activity, { foreignKey: "contactId" });
    Contact.hasMany(models.Deal, { foreignKey: "contactId", as: "deals" });
    Contact.hasMany(models.Task, { foreignKey: "contactId" });
    Contact.hasMany(models.Meeting, { foreignKey: "contactId" });
    Contact.hasMany(models.CampaignRecipient, { foreignKey: "contactId" });
    Contact.hasMany(models.Conversation, { foreignKey: "contactId" });
    Contact.hasMany(models.AutomationExecution, { foreignKey: "contactId" });
    Contact.hasMany(models.Note, { foreignKey: "contactId" });
    Contact.belongsToMany(models.ContactList, {
      through: models.ContactListMember,
      foreignKey: "contactId",
      otherKey: "listId",
      as: "lists",
    });
  };

  return Contact;
};
