"use strict";

module.exports = (sequelize, DataTypes) => {
  const ContactListMember = sequelize.define(
    "ContactListMember",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      contactId: { type: DataTypes.BIGINT, allowNull: false },
      listId: { type: DataTypes.INTEGER, allowNull: false },
      addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { tableName: "contact_list_members", updatedAt: false }
  );

  ContactListMember.associate = (models) => {
    ContactListMember.belongsTo(models.Contact, { foreignKey: "contactId" });
    ContactListMember.belongsTo(models.ContactList, { foreignKey: "listId" });
  };

  return ContactListMember;
};
