"use strict";

module.exports = (sequelize, DataTypes) => {
  const CustomField = sequelize.define(
    "CustomField",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      entityType: {
        type: DataTypes.ENUM("contact", "company", "deal"),
        allowNull: false,
      },
      key: { type: DataTypes.STRING(80), allowNull: false },
      label: { type: DataTypes.STRING(150), allowNull: false },
      fieldType: {
        type: DataTypes.ENUM(
          "text",
          "number",
          "date",
          "boolean",
          "select",
          "multiselect"
        ),
        defaultValue: "text",
      },
      options: DataTypes.JSON,
      isRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      tableName: "custom_fields",
      indexes: [{ unique: true, fields: ["entity_type", "key"] }],
    }
  );

  return CustomField;
};
