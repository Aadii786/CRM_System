"use strict";

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: DataTypes.INTEGER,
      action: { type: DataTypes.STRING(150), allowNull: false },
      module: { type: DataTypes.STRING(60), allowNull: false },
      resourceType: DataTypes.STRING(60),
      resourceId: DataTypes.STRING(60),
      departmentId: DataTypes.INTEGER,
      metadata: DataTypes.JSON,
      result: {
        type: DataTypes.ENUM("success", "denied", "error"),
        defaultValue: "success",
      },
      ipAddress: DataTypes.STRING(64),
      userAgent: DataTypes.STRING(255),
    },
    {
      tableName: "audit_logs",
      updatedAt: false,
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: "userId" });
  };

  return AuditLog;
};
