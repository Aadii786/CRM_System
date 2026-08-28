"use strict";

module.exports = (sequelize, DataTypes) => {
  const CustomObject = sequelize.define(
    "CustomObject",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: DataTypes.STRING(255),
      schema: DataTypes.JSON, // field definitions: [{key,label,type}]
    },
    { tableName: "custom_objects" }
  );

  CustomObject.associate = (models) => {
    CustomObject.hasMany(models.CustomObjectRecord, {
      foreignKey: "customObjectId",
      as: "records",
    });
  };

  return CustomObject;
};
