"use strict";

module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    "Company",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      organizationType: {
        type: DataTypes.ENUM(
          "Corporate",
          "Government",
          "University",
          "Training Organization",
          "NGO",
          "Other"
        ),
        defaultValue: "Corporate",
      },
      industry: DataTypes.STRING(120),
      website: DataTypes.STRING(255),
      phone: DataTypes.STRING(40),
      email: DataTypes.STRING(190),
      address: DataTypes.STRING(255),
      city: DataTypes.STRING(100),
      country: { type: DataTypes.STRING(100), defaultValue: "Pakistan" },
      leadSource: { type: DataTypes.STRING(40), defaultValue: "Other" },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      ownerId: DataTypes.INTEGER,
      status: {
        type: DataTypes.ENUM("Active", "Inactive", "Prospect"),
        defaultValue: "Prospect",
      },
      revenue: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      lastActivityAt: DataTypes.DATE,
      deletedAt: DataTypes.DATE,
    },
    {
      tableName: "companies",
      paranoid: true,
    }
  );

  Company.associate = (models) => {
    Company.belongsTo(models.Department, { foreignKey: "departmentId" });
    Company.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Company.hasMany(models.Contact, { foreignKey: "companyId" });
    Company.hasMany(models.Deal, { foreignKey: "companyId" });
    Company.hasMany(models.Activity, { foreignKey: "companyId" });
    Company.hasMany(models.Task, { foreignKey: "companyId" });
    Company.hasMany(models.Meeting, { foreignKey: "companyId" });
    Company.hasMany(models.TrainingProgram, { foreignKey: "companyId" });
    Company.hasMany(models.Note, { foreignKey: "companyId" });
  };

  return Company;
};
