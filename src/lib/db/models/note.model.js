"use strict";

module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define(
    "Note",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      body: { type: DataTypes.TEXT, allowNull: false },
      contactId: DataTypes.BIGINT,
      companyId: DataTypes.INTEGER,
      dealId: DataTypes.INTEGER,
      authorId: DataTypes.INTEGER,
    },
    { tableName: "notes" }
  );

  Note.associate = (models) => {
    Note.belongsTo(models.Contact, { foreignKey: "contactId" });
    Note.belongsTo(models.Company, { foreignKey: "companyId" });
    Note.belongsTo(models.Deal, { foreignKey: "dealId" });
    Note.belongsTo(models.User, { foreignKey: "authorId", as: "author" });
  };

  return Note;
};
