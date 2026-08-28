"use strict";

module.exports = (sequelize, DataTypes) => {
  const AutomationExecution = sequelize.define(
    "AutomationExecution",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      automationId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "completed", "exited"),
        defaultValue: "active",
      },
      currentNodeId: DataTypes.INTEGER,
      startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      completedAt: DataTypes.DATE,
    },
    { tableName: "automation_executions", updatedAt: false }
  );

  AutomationExecution.associate = (models) => {
    AutomationExecution.belongsTo(models.Automation, {
      foreignKey: "automationId",
    });
    AutomationExecution.belongsTo(models.Contact, { foreignKey: "contactId" });
    AutomationExecution.hasMany(models.AutomationExecutionLog, {
      foreignKey: "executionId",
      as: "logs",
    });
  };

  return AutomationExecution;
};
