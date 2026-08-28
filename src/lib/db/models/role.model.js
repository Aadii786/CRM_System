"use strict";

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      key: {
        // RECTOR, CENTRAL_CRM_ADMINISTRATOR, MARKETING_MANAGER,
        // MARKETING_EXECUTIVE, IKL_HSM_MANAGER, IKL_HSM_EXECUTIVE
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      description: DataTypes.STRING(255),
      scope: {
        // university | marketing | ikl_hsm - default department scope for this role
        type: DataTypes.STRING(30),
        defaultValue: "university",
      },
      isSystem: {
        // system roles (the 6 seeded roles) cannot be deleted from the UI
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    { tableName: "roles" }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: "roleId",
      otherKey: "permissionId",
    });
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: "roleId",
      otherKey: "userId",
    });
  };

  return Role;
};
