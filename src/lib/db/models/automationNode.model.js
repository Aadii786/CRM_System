"use strict";

// Nodes form a simple tree: each node points at its parent plus an optional
// `branch` label ("yes" / "no" / null) so condition nodes can fan out into
// two paths. `order` breaks ties among siblings for canvas layout.
module.exports = (sequelize, DataTypes) => {
  const AutomationNode = sequelize.define(
    "AutomationNode",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      automationId: { type: DataTypes.INTEGER, allowNull: false },
      parentId: DataTypes.INTEGER,
      branch: { type: DataTypes.STRING(10), allowNull: true }, // "yes" | "no" | null
      type: {
        type: DataTypes.ENUM("trigger", "condition", "action", "delay", "exit"),
        allowNull: false,
      },
      key: { type: DataTypes.STRING(60), allowNull: false }, // e.g. "send_email", "email_opened", "wait"
      label: { type: DataTypes.STRING(150), allowNull: false },
      config: DataTypes.JSON,
      order: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "automation_nodes" }
  );

  AutomationNode.associate = (models) => {
    AutomationNode.belongsTo(models.Automation, { foreignKey: "automationId" });
  };

  return AutomationNode;
};
