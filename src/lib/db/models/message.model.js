"use strict";

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      conversationId: { type: DataTypes.INTEGER, allowNull: false },
      direction: {
        type: DataTypes.ENUM("inbound", "outbound"),
        allowNull: false,
      },
      senderType: {
        type: DataTypes.ENUM("contact", "user", "system"),
        allowNull: false,
      },
      senderId: DataTypes.INTEGER,
      body: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM("sent", "delivered", "read", "failed"),
        defaultValue: "sent",
      },
      sentAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "messages", updatedAt: false }
  );

  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, { foreignKey: "conversationId" });
  };

  return Message;
};
