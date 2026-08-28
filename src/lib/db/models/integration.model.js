"use strict";

module.exports = (sequelize, DataTypes) => {
  const Integration = sequelize.define(
    "Integration",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      category: {
        type: DataTypes.ENUM("native", "third_party", "api"),
        defaultValue: "third_party",
      },
      status: {
        type: DataTypes.ENUM("connected", "disconnected", "config_required"),
        defaultValue: "disconnected",
      },
      config: DataTypes.JSON,
    },
    { tableName: "integrations" }
  );

  return Integration;
};
