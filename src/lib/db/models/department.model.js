"use strict";

// Departments are data-driven so the platform can grow from the initial
// Marketing + IKL/HSM structure to a full university-wide rollout without
// any frontend rewrite (see requirements #67-#68).
module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        // deterministic slug, e.g. "marketing", "ikl-hsm", "central-admin"
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: DataTypes.TEXT,
      isUniversityWide: {
        // true for scopes like "university" (Rector/Admin) that see across all departments
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    { tableName: "departments" }
  );

  Department.associate = (models) => {
    Department.hasMany(models.User, { foreignKey: "departmentId" });
    Department.hasMany(models.Contact, { foreignKey: "departmentId" });
    Department.hasMany(models.Company, { foreignKey: "departmentId" });
    Department.hasMany(models.Segment, { foreignKey: "departmentId" });
    Department.hasMany(models.Automation, { foreignKey: "departmentId" });
    Department.hasMany(models.Task, { foreignKey: "departmentId" });
    Department.hasMany(models.Pipeline, { foreignKey: "departmentId" });
  };

  return Department;
};
