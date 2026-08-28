"use strict";

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    "Task",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: DataTypes.TEXT,
      ownerId: DataTypes.INTEGER,
      contactId: DataTypes.BIGINT,
      companyId: DataTypes.INTEGER,
      dealId: DataTypes.INTEGER,
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      dueDate: DataTypes.DATE,
      priority: {
        type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
        defaultValue: "Medium",
      },
      status: {
        type: DataTypes.ENUM(
          "Pending",
          "In Progress",
          "Completed",
          "Overdue",
          "Cancelled"
        ),
        defaultValue: "Pending",
      },
      completedAt: DataTypes.DATE,
    },
    { tableName: "tasks" }
  );

  Task.associate = (models) => {
    Task.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Task.belongsTo(models.Contact, { foreignKey: "contactId" });
    Task.belongsTo(models.Company, { foreignKey: "companyId" });
    Task.belongsTo(models.Deal, { foreignKey: "dealId" });
    Task.belongsTo(models.Department, { foreignKey: "departmentId" });
  };

  return Task;
};
