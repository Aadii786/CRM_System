"use strict";

// A file attached to a contact, company, deal, or meeting - meeting
// minutes, proposals, contracts, TNA writeups, etc. (IKL requirements
// doc: "meeting minutes and relevant documents attached to the
// respective client/query record").
module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    "Document",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(255), allowNull: false },
      title: DataTypes.STRING(255),
      description: DataTypes.STRING(500),
      // Text found inside the file (PDF, Word, Excel, PowerPoint, text) so documents can be searched by content.
      contentText: DataTypes.TEXT("long"),
      contentStatus: DataTypes.STRING(20), // indexed | empty | unsupported | failed
      indexedAt: DataTypes.DATE,
      storedFileName: { type: DataTypes.STRING(255), allowNull: false }, // unique name on disk
      mimeType: DataTypes.STRING(100),
      fileSize: DataTypes.INTEGER, // bytes
      relatedType: {
        type: DataTypes.ENUM("contact", "company", "deal", "meeting"),
        allowNull: false,
      },
      relatedId: { type: DataTypes.INTEGER, allowNull: false },
      departmentId: { type: DataTypes.INTEGER, allowNull: false },
      uploadedBy: DataTypes.INTEGER,
    },
    { tableName: "documents" }
  );

  Document.associate = (models) => {
    Document.belongsTo(models.User, { foreignKey: "uploadedBy", as: "uploader" });
  };

  return Document;
};
