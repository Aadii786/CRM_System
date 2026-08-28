"use strict";

module.exports = (sequelize, DataTypes) => {
  const Import = sequelize.define(
    "Import",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      filename: { type: DataTypes.STRING(255), allowNull: false },
      uploadedBy: DataTypes.INTEGER,
      departmentId: DataTypes.INTEGER,
      totalRows: { type: DataTypes.INTEGER, defaultValue: 0 },
      validRows: { type: DataTypes.INTEGER, defaultValue: 0 },
      duplicateRows: { type: DataTypes.INTEGER, defaultValue: 0 },
      invalidRows: { type: DataTypes.INTEGER, defaultValue: 0 },
      importedRows: { type: DataTypes.INTEGER, defaultValue: 0 },
      fieldMapping: DataTypes.JSON,
      status: {
        type: DataTypes.ENUM(
          "uploaded",
          "mapped",
          "validated",
          "importing",
          "completed",
          "failed"
        ),
        defaultValue: "uploaded",
      },
      startedAt: DataTypes.DATE,
      completedAt: DataTypes.DATE,
    },
    { tableName: "imports" }
  );

  Import.associate = (models) => {
    Import.belongsTo(models.User, { foreignKey: "uploadedBy", as: "uploader" });
    Import.hasMany(models.ImportRow, { foreignKey: "importId", as: "rows" });
  };

  return Import;
};
