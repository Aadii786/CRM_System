"use strict";

const { PERMISSIONS } = require("../../constants/permissions");
const { ROLES } = require("../../constants/roles");

const NEW_PERMISSION_KEYS = ["lists.view", "lists.create", "lists.update", "lists.delete"];

/**
 * Lists & Folders (Brevo-style static contact groupings, distinct from the
 * existing dynamic Segments) + Brevo-parity contact fields (SMS/landline
 * split, external id, LinkedIn, timezone, detected language, double
 * opt-in, opt-in status).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableSet = new Set(tables.map((t) => String(t).toLowerCase()));

    if (!tableSet.has("list_folders")) {
      await queryInterface.createTable("list_folders", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        department_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "departments", key: "id" } },
        created_by: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    if (!tableSet.has("contact_lists")) {
      await queryInterface.createTable("contact_lists", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        folder_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "list_folders", key: "id" }, onDelete: "CASCADE" },
        department_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "departments", key: "id" } },
        created_by: { type: Sequelize.INTEGER, references: { model: "users", key: "id" }, onDelete: "SET NULL" },
        contact_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
    }

    if (!tableSet.has("contact_list_members")) {
      await queryInterface.createTable("contact_list_members", {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        contact_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "contacts", key: "id" }, onDelete: "CASCADE" },
        list_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "contact_lists", key: "id" }, onDelete: "CASCADE" },
        added_at: { type: Sequelize.DATE, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false },
      });
      await queryInterface.addIndex("contact_list_members", ["contact_id", "list_id"], { unique: true, name: "contact_list_members_unique" });
    }

    const contactColumns = await queryInterface.describeTable("contacts");
    const newContactColumns = {
      landline_number: { type: Sequelize.STRING(40), allowNull: true },
      external_id: { type: Sequelize.STRING(190), allowNull: true },
      linkedin: { type: Sequelize.STRING(255), allowNull: true },
      timezone: { type: Sequelize.STRING(60), allowNull: true },
      detected_language: { type: Sequelize.STRING(10), allowNull: true },
      double_opt_in: { type: Sequelize.ENUM("Yes", "No"), allowNull: true, defaultValue: "No" },
      opt_in: { type: Sequelize.ENUM("Opted In", "Opted Out", "Unknown"), allowNull: true, defaultValue: "Unknown" },
    };
    for (const [column, def] of Object.entries(newContactColumns)) {
      if (!contactColumns[column]) await queryInterface.addColumn("contacts", column, def);
    }

    // Idempotent permission + role-grant backfill (same pattern as
    // migration 025/028) so this is safe to re-run against an
    // already-seeded database.
    const now = new Date();
    for (const key of NEW_PERMISSION_KEYS) {
      const [existing] = await queryInterface.sequelize.query(`SELECT id FROM \`permissions\` WHERE \`key\` = :key`, { replacements: { key } });
      if (existing.length) continue;
      const def = PERMISSIONS.find((p) => p.key === key);
      await queryInterface.bulkInsert("permissions", [{ key: def.key, module: def.module, description: def.description, created_at: now, updated_at: now }]);
    }

    const [permRows] = await queryInterface.sequelize.query(`SELECT id, \`key\` FROM \`permissions\` WHERE \`key\` IN (:keys)`, { replacements: { keys: NEW_PERMISSION_KEYS } });
    const permIdByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

    for (const role of ROLES) {
      const rolePermKeys = role.permissions.filter((k) => NEW_PERMISSION_KEYS.includes(k));
      if (!rolePermKeys.length) continue;
      const [[roleRow]] = await queryInterface.sequelize.query(`SELECT id FROM \`roles\` WHERE \`key\` = :key`, { replacements: { key: role.key } });
      if (!roleRow) continue;
      for (const permKey of rolePermKeys) {
        const permId = permIdByKey[permKey];
        if (!permId) continue;
        const [already] = await queryInterface.sequelize.query(
          `SELECT id FROM \`role_permissions\` WHERE role_id = :roleId AND permission_id = :permId`,
          { replacements: { roleId: roleRow.id, permId } }
        );
        if (already.length) continue;
        await queryInterface.bulkInsert("role_permissions", [{ role_id: roleRow.id, permission_id: permId, created_at: now, updated_at: now }]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("contact_list_members").catch(() => {});
    await queryInterface.dropTable("contact_lists").catch(() => {});
    await queryInterface.dropTable("list_folders").catch(() => {});
    const contactColumns = await queryInterface.describeTable("contacts");
    for (const column of ["landline_number", "external_id", "linkedin", "timezone", "detected_language", "double_opt_in", "opt_in"]) {
      if (contactColumns[column]) await queryInterface.removeColumn("contacts", column);
    }
  },
};
