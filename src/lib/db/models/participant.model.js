"use strict";

module.exports = (sequelize, DataTypes) => {
  const Participant = sequelize.define(
    "Participant",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      trainingProgramId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(150), allowNull: false },
      designation: DataTypes.STRING(150),
      organization: DataTypes.STRING(200),
      email: DataTypes.STRING(190),
      phone: DataTypes.STRING(40),
      // The person's master contact record (one record per person).
      contactId: DataTypes.BIGINT,
      attendance: {
        type: DataTypes.ENUM("Registered", "Attended", "No Show"),
        defaultValue: "Registered",
      },
    },
    { tableName: "participants" }
  );

  Participant.associate = (models) => {
    Participant.belongsTo(models.TrainingProgram, {
      foreignKey: "trainingProgramId",
    });
    Participant.belongsTo(models.Contact, { foreignKey: "contactId", as: "contact" });
  };

  return Participant;
};
