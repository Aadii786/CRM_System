"use strict";

// A contact's interest: a specific catalogue program, or a whole category.
module.exports = (sequelize, DataTypes) => {
  const ContactInterest = sequelize.define(
    "ContactInterest",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      programId: DataTypes.INTEGER,
      category: DataTypes.STRING(100),
    },
    { tableName: "contact_interests", updatedAt: false }
  );

  ContactInterest.associate = (models) => {
    ContactInterest.belongsTo(models.Contact, { foreignKey: "contactId" });
    ContactInterest.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
  };

  return ContactInterest;
};
