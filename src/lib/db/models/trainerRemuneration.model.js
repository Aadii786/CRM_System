"use strict";

module.exports = (sequelize, DataTypes) => {
  const TrainerRemuneration = sequelize.define(
    "TrainerRemuneration",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trainingProgramId: { type: DataTypes.INTEGER, allowNull: false },
      trainerId: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("Pending", "Paid"),
        defaultValue: "Pending",
      },
      paidAt: DataTypes.DATE,
    },
    { tableName: "trainer_remunerations" }
  );

  TrainerRemuneration.associate = (models) => {
    TrainerRemuneration.belongsTo(models.TrainingProgram, {
      foreignKey: "trainingProgramId",
    });
    TrainerRemuneration.belongsTo(models.Trainer, { foreignKey: "trainerId" });
  };

  return TrainerRemuneration;
};
