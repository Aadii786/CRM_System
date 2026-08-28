"use strict";

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      invoiceId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
      method: { type: DataTypes.STRING(60), defaultValue: "Bank Transfer" },
      reference: DataTypes.STRING(150),
      paidAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "payments", updatedAt: false }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Invoice, { foreignKey: "invoiceId" });
  };

  return Payment;
};
