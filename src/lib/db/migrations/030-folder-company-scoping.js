"use strict";

/**
 * Extends the Lists/Folders module (migration 029) to support the
 * Company -> Folder -> List -> Contact hierarchy: a folder can now belong
 * to a specific company (nullable - a folder with no company stays a
 * general, department-wide folder, preserving what migration 029 built).
 * Also adds List description/status and Company size, all requested
 * alongside the hierarchy.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const folderColumns = await queryInterface.describeTable("list_folders");
    if (!folderColumns.company_id) {
      await queryInterface.addColumn("list_folders", "company_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "companies", key: "id" },
      });
    }

    const listColumns = await queryInterface.describeTable("contact_lists");
    if (!listColumns.description) {
      await queryInterface.addColumn("contact_lists", "description", { type: Sequelize.STRING(255), allowNull: true });
    }
    if (!listColumns.status) {
      await queryInterface.addColumn("contact_lists", "status", { type: Sequelize.ENUM("Active", "Archived"), allowNull: true, defaultValue: "Active" });
    }

    const companyColumns = await queryInterface.describeTable("companies");
    if (!companyColumns.company_size) {
      await queryInterface.addColumn("companies", "company_size", { type: Sequelize.STRING(30), allowNull: true });
    }

    const contactColumns = await queryInterface.describeTable("contacts");
    if (!contactColumns.contact_type) {
      await queryInterface.addColumn("contacts", "contact_type", {
        type: Sequelize.ENUM("Lead", "Prospect", "Customer", "Partner", "Other"),
        allowNull: true,
        defaultValue: "Lead",
      });
    }
  },

  async down(queryInterface) {
    const folderColumns = await queryInterface.describeTable("list_folders");
    if (folderColumns.company_id) await queryInterface.removeColumn("list_folders", "company_id");

    const listColumns = await queryInterface.describeTable("contact_lists");
    if (listColumns.description) await queryInterface.removeColumn("contact_lists", "description");
    if (listColumns.status) await queryInterface.removeColumn("contact_lists", "status");

    const companyColumns = await queryInterface.describeTable("companies");
    if (companyColumns.company_size) await queryInterface.removeColumn("companies", "company_size");

    const contactColumns = await queryInterface.describeTable("contacts");
    if (contactColumns.contact_type) await queryInterface.removeColumn("contacts", "contact_type");
  },
};
