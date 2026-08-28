"use strict";

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define(
    "ApiKey",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      // Only a short, non-secret prefix is ever surfaced in the UI, e.g. "crm_live_8f2a...".
      keyPrefix: { type: DataTypes.STRING(20), allowNull: false },
      keyHash: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "revoked"),
        defaultValue: "active",
      },
      lastUsedAt: DataTypes.DATE,
      createdBy: DataTypes.INTEGER,
    },
    { tableName: "api_keys" }
  );

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
  };

  return ApiKey;
};
