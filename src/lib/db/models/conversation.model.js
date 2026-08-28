"use strict";

module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      channel: { type: DataTypes.STRING(30), defaultValue: "whatsapp" },
      status: {
        type: DataTypes.ENUM("open", "assigned", "closed"),
        defaultValue: "open",
      },
      assignedTo: DataTypes.INTEGER,
      departmentId: DataTypes.INTEGER,
      lastMessageAt: DataTypes.DATE,
      lastMessagePreview: DataTypes.STRING(255),
      unreadCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "conversations" }
  );

  Conversation.associate = (models) => {
    Conversation.belongsTo(models.Contact, { foreignKey: "contactId" });
    Conversation.belongsTo(models.User, { foreignKey: "assignedTo", as: "assignee" });
    Conversation.belongsTo(models.Department, { foreignKey: "departmentId" });
    Conversation.hasMany(models.Message, {
      foreignKey: "conversationId",
      as: "messages",
    });
  };

  return Conversation;
};
