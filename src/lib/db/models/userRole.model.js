"use strict";

module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    "UserRole",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      roleId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: "user_roles",
      indexes: [{ unique: true, fields: ["user_id", "role_id"] }],
    }
  );

  return UserRole;
};
