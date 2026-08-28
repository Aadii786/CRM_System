"use strict";

module.exports = (sequelize, DataTypes) => {
  const ContactTag = sequelize.define(
    "ContactTag",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      contactId: { type: DataTypes.INTEGER, allowNull: false },
      tagId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "contact_tags",
      indexes: [{ unique: true, fields: ["contact_id", "tag_id"] }],
    }
  );

  return ContactTag;
};
