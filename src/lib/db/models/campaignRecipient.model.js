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
          "unsubscribed",
          "failed"
        ),
        defaultValue: "queued",
      },
      providerMessageId: DataTypes.STRING(190),
      sentAt: DataTypes.DATE,
      lastEventAt: DataTypes.DATE,
      error: DataTypes.STRING(255),
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
