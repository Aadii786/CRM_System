"use strict";

module.exports = (sequelize, DataTypes) => {
  const Trainer = sequelize.define(
    "Trainer",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      email: DataTypes.STRING(190),
      phone: DataTypes.STRING(40),
      specialization: DataTypes.STRING(150),
      remunerationRate: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM("Active", "Inactive"),
        defaultValue: "Active",
      },
    },
    { tableName: "trainers" }
  );

  Trainer.associate = (models) => {
    Trainer.hasMany(models.TrainingProgram, { foreignKey: "trainerId" });
    Trainer.hasMany(models.TrainerRemuneration, { foreignKey: "trainerId" });
  };

  return Trainer;
};
