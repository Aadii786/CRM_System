"use strict";

// Groups Lists (see contactList.model.js) for organization, exactly like
// Brevo's "Lists and Folders" - a folder is just a named bucket, contacts
// are never members of a folder directly, only of the lists inside it.
module.exports = (sequelize, DataTypes) => {
  const ListFolder = sequelize.define(
    "ListFolder",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      createdBy: DataTypes.INTEGER,
    },
    { tableName: "list_folders" }
  );

  ListFolder.associate = (models) => {
    ListFolder.belongsTo(models.Department, { foreignKey: "departmentId" });
    ListFolder.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
    ListFolder.hasMany(models.ContactList, { foreignKey: "folderId", as: "lists" });
  };

  return ListFolder;
};
