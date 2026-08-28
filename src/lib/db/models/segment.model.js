"use strict";

module.exports = (sequelize, DataTypes) => {
  const Segment = sequelize.define(
    "Segment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: DataTypes.STRING(255),
      type: {
        type: DataTypes.ENUM("static", "dynamic"),
        defaultValue: "dynamic",
      },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      createdBy: DataTypes.INTEGER,
      contactCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "segments" }
  );

  Segment.associate = (models) => {
    Segment.belongsTo(models.Department, { foreignKey: "departmentId" });
    Segment.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Segment.hasMany(models.SegmentCondition, {
      foreignKey: "segmentId",
      as: "conditions",
    });
    Segment.hasMany(models.Campaign, { foreignKey: "segmentId" });
  };

  return Segment;
};
