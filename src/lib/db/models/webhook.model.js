"use strict";

module.exports = (sequelize, DataTypes) => {
  const Webhook = sequelize.define(
    "Webhook",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      url: { type: DataTypes.STRING(500), allowNull: false },
      events: DataTypes.JSON,
      status: {
        type: DataTypes.ENUM("active", "disabled"),
        defaultValue: "active",
      },
      secretMasked: DataTypes.STRING(60),
      lastTriggeredAt: DataTypes.DATE,
      lastStatus: DataTypes.STRING(20),
    },
    { tableName: "webhooks" }
  );

  return Webhook;
};
