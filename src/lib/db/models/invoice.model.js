"use strict";

module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      proposalId: DataTypes.INTEGER,
      invoiceNumber: { type: DataTypes.STRING(60), allowNull: false, unique: true },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      paidAmount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM("Unpaid", "Partial", "Paid", "Overdue"),
        defaultValue: "Unpaid",
      },
      issueDate: DataTypes.DATEONLY,
      dueDate: DataTypes.DATEONLY,
    },
    { tableName: "invoices" }
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Deal, { foreignKey: "dealId" });
    Invoice.belongsTo(models.Proposal, { foreignKey: "proposalId" });
    Invoice.hasMany(models.Payment, { foreignKey: "invoiceId" });
  };

  return Invoice;
};
