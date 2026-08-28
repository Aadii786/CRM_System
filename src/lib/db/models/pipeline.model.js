"use strict";

// Multiple named pipelines are supported (requirements #33), e.g.
// "Training Pipeline", "Consultancy Pipeline", "Corporate Pipeline".
module.exports = (sequelize, DataTypes) => {
  const Pipeline = sequelize.define(
    "Pipeline",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: "pipelines" }
  );

  Pipeline.associate = (models) => {
    Pipeline.belongsTo(models.Department, { foreignKey: "departmentId" });
    Pipeline.hasMany(models.PipelineStage, {
      foreignKey: "pipelineId",
      as: "stages",
    });
    Pipeline.hasMany(models.Deal, { foreignKey: "pipelineId" });
  };

  return Pipeline;
};
