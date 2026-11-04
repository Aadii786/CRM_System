"use strict";

// Extra organizations a person is linked to (the primary one stays on
// contacts.company_id): one person record across organizations.
module.exports = (sequelize, DataTypes) => {
  const ContactCompany = sequelize.define(
    "ContactCompany",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      jobTitle: DataTypes.STRING(150),
    },
    { tableName: "contact_companies", updatedAt: false }
  );

  ContactCompany.associate = (models) => {
    ContactCompany.belongsTo(models.Contact, { foreignKey: "contactId" });
    ContactCompany.belongsTo(models.Company, { foreignKey: "companyId" });
  };

  return ContactCompany;
};
