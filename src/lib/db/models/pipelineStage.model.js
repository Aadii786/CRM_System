"use strict";

module.exports = (sequelize, DataTypes) => {
  const PipelineStage = sequelize.define(
    "PipelineStage",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      pipelineId: { type: DataTypes.INTEGER, allowNull: false },
      key: { type: DataTypes.STRING(60), allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: false },
      order: { type: DataTypes.INTEGER, allowNull: false },
      probability: { type: DataTypes.INTEGER, defaultValue: 10 },
      isWon: { type: DataTypes.BOOLEAN, defaultValue: false },
      isLost: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "pipeline_stages",
      indexes: [{ unique: true, fields: ["pipeline_id", "key"] }],
    }
  );

  PipelineStage.associate = (models) => {
    PipelineStage.belongsTo(models.Pipeline, { foreignKey: "pipelineId" });
    PipelineStage.hasMany(models.Deal, { foreignKey: "stageId" });
  };

  return PipelineStage;
};
