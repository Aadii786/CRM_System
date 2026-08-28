"use strict";

module.exports = (sequelize, DataTypes) => {
  const AutomationExecutionLog = sequelize.define(
    "AutomationExecutionLog",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      executionId: { type: DataTypes.BIGINT, allowNull: false },
      nodeId: DataTypes.INTEGER,
      action: { type: DataTypes.STRING(150), allowNull: false },
      result: DataTypes.STRING(255),
      occurredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "automation_execution_logs", updatedAt: false }
  );

  AutomationExecutionLog.associate = (models) => {
    AutomationExecutionLog.belongsTo(models.AutomationExecution, {
      foreignKey: "executionId",
    });
  };

  return AutomationExecutionLog;
};
