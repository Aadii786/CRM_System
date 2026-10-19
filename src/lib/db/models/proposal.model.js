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
      title: DataTypes.STRING(200),
      // Draft work -> "Pending" (submitted) -> "Approved" / "Rejected" by the
      // department head (deals.approve). A proposal can only be marked Sent
      // once Approved.
      approvalStatus: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Not submitted",
      },
      approvedById: DataTypes.INTEGER,
      approvedAt: DataTypes.DATE,
      rejectionReason: DataTypes.STRING(500),
      createdById: DataTypes.INTEGER,
    },
    { tableName: "proposals" }
  );

  Proposal.associate = (models) => {
    Proposal.belongsTo(models.Deal, { foreignKey: "dealId" });
    Proposal.hasMany(models.Invoice, { foreignKey: "proposalId" });
    Proposal.belongsTo(models.User, { foreignKey: "createdById", as: "createdBy" });
    Proposal.belongsTo(models.User, { foreignKey: "approvedById", as: "approvedBy" });
  };

  return Proposal;
};
