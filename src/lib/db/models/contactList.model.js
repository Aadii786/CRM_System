"use strict";

// A static, manually-curated group of contacts (requirements: Lists vs
// Segments - a List's membership is explicit/managed, unlike a Segment's
// dynamic rule-matched membership - see segment.model.js). Every list
// belongs to exactly one folder.
module.exports = (sequelize, DataTypes) => {
  const ContactList = sequelize.define(
    "ContactList",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      folderId: { type: DataTypes.INTEGER, allowNull: false },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      createdBy: DataTypes.INTEGER,
      // Denormalized count kept in sync by listService as members change -
      // avoids a COUNT(*) join on every list-table render (same pattern as
      // Segment.contactCount).
      contactCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    },
    { tableName: "contact_lists" }
  );

  ContactList.associate = (models) => {
    ContactList.belongsTo(models.ListFolder, { foreignKey: "folderId", as: "folder" });
    ContactList.belongsTo(models.Department, { foreignKey: "departmentId" });
    ContactList.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    ContactList.belongsToMany(models.Contact, {
      through: models.ContactListMember,
      foreignKey: "listId",
      otherKey: "contactId",
    });
  };

  return ContactList;
};
