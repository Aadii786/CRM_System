"use strict";

module.exports = (sequelize, DataTypes) => {
  const Meeting = sequelize.define(
    "Meeting",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      contactId: DataTypes.BIGINT,
      companyId: DataTypes.INTEGER,
      dealId: DataTypes.INTEGER,
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      ownerId: DataTypes.INTEGER,
      startAt: { type: DataTypes.DATE, allowNull: false },
      endAt: DataTypes.DATE,
      location: DataTypes.STRING(255),
      attendees: DataTypes.JSON,
      notes: DataTypes.TEXT,
      outcome: DataTypes.STRING(255),
      status: {
        type: DataTypes.ENUM("Scheduled", "Completed", "Cancelled"),
        defaultValue: "Scheduled",
      },
    },
    { tableName: "meetings" }
  );

  Meeting.associate = (models) => {
    Meeting.belongsTo(models.Contact, { foreignKey: "contactId" });
    Meeting.belongsTo(models.Company, { foreignKey: "companyId" });
    Meeting.belongsTo(models.Deal, { foreignKey: "dealId" });
    Meeting.belongsTo(models.User, { foreignKey: "ownerId", as: "owner" });
    Meeting.belongsTo(models.Department, { foreignKey: "departmentId" });
  };

  return Meeting;
};
