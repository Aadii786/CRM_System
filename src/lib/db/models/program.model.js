"use strict";

// Program catalogue item (IKL): a course IKL offers repeatedly. Dated runs are
// ProgramBatch rows; one-off corporate deliveries stay as TrainingProgram
// engagements on a deal.
module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define(
    "Program",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      code: DataTypes.STRING(40),
      title: { type: DataTypes.STRING(200), allowNull: false },
      category: DataTypes.STRING(100),
      programType: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "Open enrollment" },
      durationDays: DataTypes.INTEGER,
      durationText: DataTypes.STRING(100),
      defaultFee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      description: DataTypes.TEXT,
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Active" },
      createdBy: DataTypes.INTEGER,
    },
    { tableName: "programs" }
  );

  Program.associate = (models) => {
    Program.belongsTo(models.Department, { foreignKey: "departmentId" });
    Program.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    Program.hasMany(models.ProgramBatch, { foreignKey: "programId", as: "batches" });
    Program.hasMany(models.ContactInterest, { foreignKey: "programId", as: "interests" });
    Program.hasMany(models.Deal, { foreignKey: "programId" });
  };

  return Program;
};
