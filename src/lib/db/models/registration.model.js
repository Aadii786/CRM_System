"use strict";

// A person's place in one batch of an open-enrollment program: status, attendance,
// fee and payment reference, completion + certificate record, and program feedback.
module.exports = (sequelize, DataTypes) => {
  const Registration = sequelize.define(
    "Registration",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      programId: { type: DataTypes.INTEGER, allowNull: false },
      batchId: { type: DataTypes.INTEGER, allowNull: false },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      companyId: DataTypes.INTEGER,
      nominationRef: DataTypes.STRING(40),
      source: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "Manual" },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Registered" },
      attendance: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Registered" },
      fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Unpaid" },
      amountPaid: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      invoiceNumber: DataTypes.STRING(60),
      completionStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "In progress" },
      completedAt: DataTypes.DATEONLY,
      certificateIssued: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      certificateNumber: DataTypes.STRING(60),
      certificateDate: DataTypes.DATEONLY,
      feedbackScore: DataTypes.TINYINT,
      feedbackComments: DataTypes.TEXT,
      feedbackAt: DataTypes.DATE,
      notes: DataTypes.TEXT,
      createdBy: DataTypes.INTEGER,
    },
    { tableName: "registrations" }
  );

  Registration.associate = (models) => {
    Registration.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
    Registration.belongsTo(models.ProgramBatch, { foreignKey: "batchId", as: "batch" });
    Registration.belongsTo(models.Contact, { foreignKey: "contactId", as: "contact" });
    Registration.belongsTo(models.Company, { foreignKey: "companyId", as: "company" });
    Registration.belongsTo(models.Department, { foreignKey: "departmentId" });
  };

  return Registration;
};
