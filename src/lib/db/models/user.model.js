"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: { type: DataTypes.STRING(150), allowNull: false },
      email: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      // bcrypt hash - never selected by default in service queries that
      // return users to the client.
      passwordHash: { type: DataTypes.STRING(255), allowNull: false },
      jobTitle: DataTypes.STRING(150),
      avatarColor: { type: DataTypes.STRING(20), defaultValue: "#6366F1" },
      // Primary role key duplicated for fast reads (also has full m2m via UserRole)
      primaryRoleKey: DataTypes.STRING(60),
      departmentId: DataTypes.INTEGER,
      status: {
        type: DataTypes.ENUM("active", "disabled"),
        defaultValue: "active",
      },
      lastActiveAt: DataTypes.DATE,
      deletedAt: DataTypes.DATE,
    },
    {
      tableName: "users",
      paranoid: true,
      defaultScope: {
        attributes: { exclude: ["passwordHash"] },
      },
      scopes: {
        withPassword: { attributes: {} },
      },
    }
  );

  User.associate = (models) => {
    User.belongsTo(models.Department, { foreignKey: "departmentId" });
    User.belongsToMany(models.Role, {
      through: models.UserRole,
      foreignKey: "userId",
      otherKey: "roleId",
    });
    User.hasMany(models.Contact, { foreignKey: "ownerId", as: "ownedContacts" });
    User.hasMany(models.Company, { foreignKey: "ownerId", as: "ownedCompanies" });
    User.hasMany(models.Deal, { foreignKey: "ownerId", as: "ownedDeals" });
    User.hasMany(models.Task, { foreignKey: "ownerId", as: "ownedTasks" });
    User.hasMany(models.Notification, { foreignKey: "userId" });
    User.hasMany(models.AuditLog, { foreignKey: "userId" });
  };

  return User;
};
