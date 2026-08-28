"use strict";

// Fine-grained permission keys, e.g. "contacts.view", "campaigns.send".
// See src/lib/permissions/definitions.js for the authoritative catalog
// used to seed this table.
module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      module: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      description: DataTypes.STRING(255),
    },
    { tableName: "permissions" }
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: "permissionId",
      otherKey: "roleId",
    });
  };

  return Permission;
};
