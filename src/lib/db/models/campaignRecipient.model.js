"use strict";

module.exports = (sequelize, DataTypes) => {
  const CampaignRecipient = sequelize.define(
    "CampaignRecipient",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      campaignId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      status: {
        type: DataTypes.ENUM(
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
    },
    {
      tableName: "campaign_recipients",
      indexes: [{ unique: true, fields: ["campaign_id", "contact_id"] }],
    }
  );

  CampaignRecipient.associate = (models) => {
    CampaignRecipient.belongsTo(models.Campaign, { foreignKey: "campaignId" });
    CampaignRecipient.belongsTo(models.Contact, { foreignKey: "contactId" });
  };

  return CampaignRecipient;
};
