"use strict";

module.exports = (sequelize, DataTypes) => {
  const CampaignEvent = sequelize.define(
    "CampaignEvent",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      campaignId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      type: {
        type: DataTypes.ENUM(
          "sent",
          "delivered",
          "opened",
          "clicked",
          "bounced",
          "unsubscribed"
        ),
        allowNull: false,
      },
      occurredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      metadata: DataTypes.JSON,
    },
    { tableName: "campaign_events", updatedAt: false }
  );

  CampaignEvent.associate = (models) => {
    CampaignEvent.belongsTo(models.Campaign, { foreignKey: "campaignId" });
    CampaignEvent.belongsTo(models.Contact, { foreignKey: "contactId" });
  };

  return CampaignEvent;
};
