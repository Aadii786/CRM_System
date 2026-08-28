"use strict";

module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      roleId: { type: DataTypes.INTEGER, allowNull: false },
      permissionId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "role_permissions",
      indexes: [{ unique: true, fields: ["role_id", "permission_id"] }],
    }
  );

  return RolePermission;
};
