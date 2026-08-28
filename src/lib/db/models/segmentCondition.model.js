"use strict";

module.exports = (sequelize, DataTypes) => {
  const SegmentCondition = sequelize.define(
    "SegmentCondition",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      segmentId: { type: DataTypes.INTEGER, allowNull: false },
      field: { type: DataTypes.STRING(60), allowNull: false }, // e.g. status, leadScore, source, city
      operator: { type: DataTypes.STRING(30), allowNull: false }, // equals, contains, gt, lt, in, between
      value: DataTypes.STRING(255),
      groupIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "segment_conditions" }
  );

  SegmentCondition.associate = (models) => {
    SegmentCondition.belongsTo(models.Segment, { foreignKey: "segmentId" });
  };

  return SegmentCondition;
};
