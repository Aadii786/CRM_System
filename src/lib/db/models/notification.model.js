"use strict";

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING(60), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: DataTypes.STRING(500),
      link: DataTypes.STRING(255),
      isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: "notifications", updatedAt: false }
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Notification;
};
