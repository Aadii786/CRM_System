"use strict";

module.exports = (sequelize, DataTypes) => {
  const Deal = sequelize.define(
    "Deal",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      // Human-facing tracking number for the query/lead, e.g. "IKL-2026-0001"
      // (IKL requirements doc: "each query should be assigned a unique
      // reference/lead number for tracking purposes").
      referenceNumber: { type: DataTypes.STRING(30), unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      pipelineId: { type: DataTypes.INTEGER, allowNull: false },
      stageId: { type: DataTypes.INTEGER, allowNull: false },
      companyId: DataTypes.INTEGER,
      contactId: DataTypes.BIGINT,
      ownerId: DataTypes.INTEGER,
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      value: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      probability: { type: DataTypes.INTEGER, defaultValue: 10 },
      expectedCloseDate: DataTypes.DATEONLY,
      closedAt: DataTypes.DATE,
      source: { type: DataTypes.STRING(40), defaultValue: "Other" },
      trainingType: {
        type: DataTypes.ENUM("ODC", "OB", "OEP", "CP", "Consultancy"),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("open", "won", "lost"),
        defaultValue: "open",
      },
      lastActivityAt: DataTypes.DATE,
      // The catalogue program / batch the inquiry is about (IKL Sprint 2).
      programId: DataTypes.INTEGER,
      batchId: DataTypes.INTEGER,
      deletedAt: DataTypes.DATE,
    },
    {
      tableName: "deals",
      paranoid: true,
    }
  );

  Deal.associate = (models) => {
    Deal.belongsTo(models.Pipeline, { foreignKey: "pipelineId" });
    Deal.belongsTo(models.PipelineStage, { foreignKey: "stageId", as: "stage" });
    Deal.belongsTo(models.Company, { foreignKey: "companyId" });
    Deal.belongsTo(models.Contact, { foreignKey: "contactId", as: "contact" });
    Deal.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Deal.belongsTo(models.Department, { foreignKey: "departmentId" });
    Deal.hasMany(models.Activity, { foreignKey: "dealId" });
    Deal.hasMany(models.Task, { foreignKey: "dealId" });
    Deal.hasMany(models.Meeting, { foreignKey: "dealId" });
    Deal.hasMany(models.Note, { foreignKey: "dealId" });
    Deal.hasMany(models.TrainingProgram, { foreignKey: "dealId" });
    Deal.hasMany(models.TNA, { foreignKey: "dealId" });
    Deal.hasMany(models.Proposal, { foreignKey: "dealId" });
    Deal.hasMany(models.Invoice, { foreignKey: "dealId" });
    Deal.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
    Deal.belongsTo(models.ProgramBatch, { foreignKey: "batchId", as: "batch" });
  };

  return Deal;
};
