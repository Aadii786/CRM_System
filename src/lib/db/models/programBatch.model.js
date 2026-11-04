"use strict";

// One dated run of a catalogue program: dates, venue, trainer, seats and fee.
module.exports = (sequelize, DataTypes) => {
  const ProgramBatch = sequelize.define(
    "ProgramBatch",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      programId: { type: DataTypes.INTEGER, allowNull: false },
      code: DataTypes.STRING(60),
      startDate: DataTypes.DATEONLY,
      endDate: DataTypes.DATEONLY,
      venue: DataTypes.STRING(255),
      trainerId: DataTypes.INTEGER,
      capacity: DataTypes.INTEGER,
      fee: DataTypes.DECIMAL(12, 2),
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "Planned" },
      notes: DataTypes.TEXT,
      createdBy: DataTypes.INTEGER,
    },
    { tableName: "program_batches" }
  );

  ProgramBatch.associate = (models) => {
    ProgramBatch.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
    ProgramBatch.belongsTo(models.Trainer, { foreignKey: "trainerId", as: "trainer" });
    ProgramBatch.hasMany(models.Deal, { foreignKey: "batchId" });
  };

  return ProgramBatch;
};
