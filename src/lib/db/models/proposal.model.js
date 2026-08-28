"use strict";

module.exports = (sequelize, DataTypes) => {
  const Proposal = sequelize.define(
    "Proposal",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      type: {
        type: DataTypes.ENUM("Initial", "Final"),
        defaultValue: "Initial",
      },
      value: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      sentDate: DataTypes.DATEONLY,
      status: {
        type: DataTypes.ENUM("Draft", "Sent", "Accepted", "Rejected"),
        defaultValue: "Draft",
      },
      notes: DataTypes.TEXT,
    },
    { tableName: "proposals" }
  );

  Proposal.associate = (models) => {
    Proposal.belongsTo(models.Deal, { foreignKey: "dealId" });
    Proposal.hasMany(models.Invoice, { foreignKey: "proposalId" });
  };

  return Proposal;
};
