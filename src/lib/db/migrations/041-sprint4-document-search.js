"use strict";

/**
 * Sprint 4 (CRM-5.4, CRM-5.5): documents get a title and the text found inside the file, so they can be
 * searched by name, title, description and content. Existing files are read by the "Index documents"
 * button on the Documents screen. Idempotent.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.describeTable("documents");
    const add = async (name, def) => { if (!t[name]) await queryInterface.addColumn("documents", name, def); };
    await add("title", { type: Sequelize.STRING(255), allowNull: true });
    await add("content_text", { type: Sequelize.TEXT("long"), allowNull: true });
    await add("content_status", { type: Sequelize.STRING(20), allowNull: true });
    await add("indexed_at", { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    const t = await queryInterface.describeTable("documents");
    for (const c of ["title", "content_text", "content_status", "indexed_at"]) if (t[c]) await queryInterface.removeColumn("documents", c);
  },
};
