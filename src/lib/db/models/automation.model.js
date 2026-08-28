"use strict";

module.exports = (sequelize, DataTypes) => {
  const Automation = sequelize.define(
    "Automation",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      description: DataTypes.STRING(255),
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("Draft", "Active", "Paused", "Archived"),
        defaultValue: "Draft",
      },
      triggerType: { type: DataTypes.STRING(60), allowNull: false },
      triggerConfig: DataTypes.JSON,
      createdBy: DataTypes.INTEGER,
      totalEntered: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalActive: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalCompleted: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalExited: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalConverted: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "automations" }
  );

  Automation.associate = (models) => {
    Automation.belongsTo(models.Department, { foreignKey: "departmentId" });
    Automation.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Automation.hasMany(models.AutomationNode, {
      foreignKey: "automationId",
      as: "nodes",
    });
    Automation.hasMany(models.AutomationExecution, {
      foreignKey: "automationId",
    });
  };

  return Automation;
};
