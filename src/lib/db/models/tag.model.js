"use strict";

module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define(
    "Tag",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      color: { type: DataTypes.STRING(20), defaultValue: "#6366F1" },
    },
    { tableName: "tags" }
  );

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Contact, {
      through: models.ContactTag,
      foreignKey: "tagId",
      otherKey: "contactId",
    });
  };

  return Tag;
};
