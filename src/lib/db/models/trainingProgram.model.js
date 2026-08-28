"use strict";

module.exports = (sequelize, DataTypes) => {
  const TrainingProgram = sequelize.define(
    "TrainingProgram",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dealId: DataTypes.INTEGER,
      companyId: DataTypes.INTEGER,
      title: { type: DataTypes.STRING(200), allowNull: false },
      trainingType: {
        type: DataTypes.ENUM("ODC", "OB", "OEP", "CP", "Consultancy"),
        allowNull: false,
      },
      trainerId: DataTypes.INTEGER,
      startDate: DataTypes.DATEONLY,
      endDate: DataTypes.DATEONLY,
      location: DataTypes.STRING(255),
      status: {
        type: DataTypes.ENUM(
          "Planned",
          "In Progress",
          "Completed",
          "Cancelled"
        ),
        defaultValue: "Planned",
      },
      participantsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      cost: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
      feedbackScore: DataTypes.DECIMAL(3, 2),
      feedbackNotes: DataTypes.TEXT,
    },
    { tableName: "training_programs" }
  );

  TrainingProgram.associate = (models) => {
    TrainingProgram.belongsTo(models.Deal, { foreignKey: "dealId" });
    TrainingProgram.belongsTo(models.Company, { foreignKey: "companyId" });
    TrainingProgram.belongsTo(models.Trainer, { foreignKey: "trainerId" });
    TrainingProgram.hasMany(models.Participant, {
      foreignKey: "trainingProgramId",
      as: "participants",
    });
    TrainingProgram.hasMany(models.TrainerRemuneration, {
      foreignKey: "trainingProgramId",
    });
  };

  return TrainingProgram;
};
