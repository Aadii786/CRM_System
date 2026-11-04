"use strict";

module.exports = (sequelize, DataTypes) => {
  const Campaign = sequelize.define(
    "Campaign",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      subject: DataTypes.STRING(255),
      senderName: DataTypes.STRING(150),
      senderEmail: DataTypes.STRING(190),
      replyTo: DataTypes.STRING(190),
      bodyHtml: DataTypes.TEXT("long"),
      // Drag-and-drop email builder's element tree (positions/sizes/content
      // per block) - kept alongside bodyHtml so a campaign can be reopened
      // and edited visually, not just as flattened HTML.
      bodyDesign: DataTypes.JSON,
      segmentId: DataTypes.INTEGER,
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      createdBy: DataTypes.INTEGER,
      status: {
        type: DataTypes.ENUM(
          "Draft",
          "Scheduled",
          "Sending",
          "Sent",
          "Paused",
          "Failed"
        ),
        defaultValue: "Draft",
      },
      scheduledAt: DataTypes.DATE,
      sentAt: DataTypes.DATE,
      // Delivery layer bookkeeping (see lib/email and emailDeliveryService).
      provider: DataTypes.STRING(40),
      startedAt: DataTypes.DATE,
      errorMessage: DataTypes.STRING(500),
      // Aggregated counters kept in sync by campaignService as events land -
      // avoids COUNT(*) over campaign_events on every dashboard render.
      recipientsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      deliveredCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      openedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      clickedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      bouncedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      unsubscribedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "campaigns" }
  );

  Campaign.associate = (models) => {
    Campaign.belongsTo(models.Segment, { foreignKey: "segmentId" });
    Campaign.belongsTo(models.Department, { foreignKey: "departmentId" });
    Campaign.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Campaign.hasMany(models.CampaignRecipient, { foreignKey: "campaignId" });
    Campaign.hasMany(models.CampaignEvent, { foreignKey: "campaignId" });
  };

  return Campaign;
};
