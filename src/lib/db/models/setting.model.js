"use strict";

module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define(
    "Setting",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      category: { type: DataTypes.STRING(60), allowNull: false },
      key: { type: DataTypes.STRING(100), allowNull: false },
      value: DataTypes.JSON,
    },
    {
      tableName: "settings",
      indexes: [{ unique: true, fields: ["category", "key"] }],
    }
  );

  return Setting;
};
