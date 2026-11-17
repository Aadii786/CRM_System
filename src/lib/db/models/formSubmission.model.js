"use strict";

// One call from the IKL website (enquiry, brochure, registration, feedback), kept as received.
module.exports = (sequelize, DataTypes) => {
  const FormSubmission = sequelize.define(
    "FormSubmission",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      formType: { type: DataTypes.STRING(30), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "Processed" },
      contactId: DataTypes.BIGINT,
      registrationId: DataTypes.INTEGER,
      isNewContact: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sourcePage: DataTypes.STRING(255),
      payload: DataTypes.JSON,
      error: DataTypes.STRING(255),
      apiKeyId: DataTypes.INTEGER,
    },
    { tableName: "form_submissions", updatedAt: false }
  );

  FormSubmission.associate = (models) => {
    FormSubmission.belongsTo(models.Contact, { foreignKey: "contactId", as: "contact" });
    FormSubmission.belongsTo(models.Department, { foreignKey: "departmentId" });
  };

  return FormSubmission;
};
