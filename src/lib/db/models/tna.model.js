"use strict";

// Training Needs Assessment
module.exports = (sequelize, DataTypes) => {
  const TNA = sequelize.define(
    "TNA",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dealId: { type: DataTypes.INTEGER, allowNull: false },
      requirement: { type: DataTypes.TEXT, allowNull: false },
      assessment: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM("Pending", "In Progress", "Completed"),
        defaultValue: "Pending",
      },
      responsiblePerson: DataTypes.STRING(150),
      notes: DataTypes.TEXT,
    },
    { tableName: "tnas" }
  );

  TNA.associate = (models) => {
    TNA.belongsTo(models.Deal, { foreignKey: "dealId" });
  };

  return TNA;
};
