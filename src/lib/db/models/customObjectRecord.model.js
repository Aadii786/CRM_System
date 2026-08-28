"use strict";

module.exports = (sequelize, DataTypes) => {
  const CustomObjectRecord = sequelize.define(
    "CustomObjectRecord",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      customObjectId: { type: DataTypes.INTEGER, allowNull: false },
      relatedType: DataTypes.STRING(60), // e.g. "deal", "company"
      relatedId: DataTypes.INTEGER,
      data: DataTypes.JSON,
    },
    { tableName: "custom_object_records" }
  );

  CustomObjectRecord.associate = (models) => {
    CustomObjectRecord.belongsTo(models.CustomObject, {
      foreignKey: "customObjectId",
    });
  };

  return CustomObjectRecord;
};
