"use strict";

module.exports = (sequelize, DataTypes) => {
  const ImportRow = sequelize.define(
    "ImportRow",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      importId: { type: DataTypes.INTEGER, allowNull: false },
      rowNumber: { type: DataTypes.INTEGER, allowNull: false },
      data: DataTypes.JSON,
      status: {
        type: DataTypes.ENUM("valid", "duplicate", "invalid", "imported"),
        allowNull: false,
      },
      errorMessage: DataTypes.STRING(255),
    },
    { tableName: "import_rows", updatedAt: false }
  );

  ImportRow.associate = (models) => {
    ImportRow.belongsTo(models.Import, { foreignKey: "importId" });
  };

  return ImportRow;
};
