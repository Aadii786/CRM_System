"use strict";

// Unified activity/timeline entry, polymorphically attached to a contact,
// company and/or deal. Powers the "Contact Activity Timeline" (#81) and the
// generic "Activities" module (#38) without duplicating a ContactActivity /
// DealActivity table pair.
module.exports = (sequelize, DataTypes) => {
  const Activity = sequelize.define(
    "Activity",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      type: {
        type: DataTypes.ENUM(
          "email",
          "whatsapp",
          "call",
          "meeting",
          "note",
          "task",
          "campaign",
          "automation",
          "deal_stage",
          "proposal",
          "payment",
          "status_change",
          "lead_score",
          "import",
          "system"
        ),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: DataTypes.TEXT,
      contactId: DataTypes.BIGINT,
      companyId: DataTypes.INTEGER,
      dealId: DataTypes.INTEGER,
      userId: DataTypes.INTEGER,
      metadata: DataTypes.JSON,
      occurredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "activities",
      updatedAt: false,
    }
  );

  Activity.associate = (models) => {
    Activity.belongsTo(models.Contact, { foreignKey: "contactId" });
    Activity.belongsTo(models.Company, { foreignKey: "companyId" });
    Activity.belongsTo(models.Deal, { foreignKey: "dealId" });
    Activity.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Activity;
};
