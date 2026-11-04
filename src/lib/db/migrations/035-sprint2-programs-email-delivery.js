"use strict";

/**
 * Sprint 2 (IKL): program catalogue + batches, program interests, one person
 * record (lifecycle flags, extra organizations, participants linked to a
 * contact), inquiries linked to a program, and the columns the email delivery
 * layer needs (provider message id, error, unsubscribe time). Idempotent.
 */
const READERS = [
  "DEPARTMENT_HEAD", "DEPARTMENT_SALES", "DEPARTMENT_MARKETING", "TEAM_MEMBER",
  "IKL_HSM_MANAGER", "IKL_HSM_EXECUTIVE", "CENTRAL_CRM_ADMINISTRATOR", "RECTOR",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === "string" ? t : t.tableName));
    const has = (t) => tables.includes(t);
    const addCol = async (table, name, def) => {
      const d = await queryInterface.describeTable(table);
      if (!d[name]) await queryInterface.addColumn(table, name, def);
    };
    const ts = { created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }, updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") } };

    if (!has("programs")) {
      await queryInterface.createTable("programs", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        department_id: { type: Sequelize.INTEGER, allowNull: false },
        code: { type: Sequelize.STRING(40), allowNull: true },
        title: { type: Sequelize.STRING(200), allowNull: false },
        category: { type: Sequelize.STRING(100), allowNull: true },
        program_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "Open enrollment" },
        duration_days: { type: Sequelize.INTEGER, allowNull: true },
        duration_text: { type: Sequelize.STRING(100), allowNull: true },
        default_fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        description: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Active" },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex("programs", ["department_id", "status"], { name: "programs_department_status" });
      await queryInterface.addIndex("programs", ["department_id", "code"], { name: "programs_department_code", unique: true });
    }

    if (!has("program_batches")) {
      await queryInterface.createTable("program_batches", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        program_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "programs", key: "id" }, onDelete: "CASCADE" },
        code: { type: Sequelize.STRING(60), allowNull: true },
        start_date: { type: Sequelize.DATEONLY, allowNull: true },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        venue: { type: Sequelize.STRING(255), allowNull: true },
        trainer_id: { type: Sequelize.INTEGER, allowNull: true },
        capacity: { type: Sequelize.INTEGER, allowNull: true },
        fee: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "Planned" },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex("program_batches", ["program_id", "start_date"], { name: "program_batches_program_start" });
    }

    if (!has("contact_interests")) {
      await queryInterface.createTable("contact_interests", {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        contact_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "contacts", key: "id" }, onDelete: "CASCADE" },
        program_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "programs", key: "id" }, onDelete: "CASCADE" },
        category: { type: Sequelize.STRING(100), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("contact_interests", ["contact_id"], { name: "contact_interests_contact" });
      await queryInterface.addIndex("contact_interests", ["program_id"], { name: "contact_interests_program" });
    }

    if (!has("contact_companies")) {
      await queryInterface.createTable("contact_companies", {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        contact_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "contacts", key: "id" }, onDelete: "CASCADE" },
        company_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "companies", key: "id" }, onDelete: "CASCADE" },
        job_title: { type: Sequelize.STRING(150), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("contact_companies", ["contact_id", "company_id"], { name: "contact_companies_unique", unique: true });
    }

    await addCol("contacts", "is_participant", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addCol("contacts", "is_alumnus", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addCol("contacts", "alumni_since", { type: Sequelize.DATEONLY, allowNull: true });
    await addCol("contacts", "unsubscribed_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("deals", "program_id", { type: Sequelize.INTEGER, allowNull: true });
    await addCol("deals", "batch_id", { type: Sequelize.INTEGER, allowNull: true });
    await addCol("participants", "contact_id", { type: Sequelize.BIGINT, allowNull: true });
    await addCol("campaigns", "provider", { type: Sequelize.STRING(40), allowNull: true });
    await addCol("campaigns", "started_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("campaigns", "error_message", { type: Sequelize.STRING(500), allowNull: true });
    await addCol("campaign_recipients", "provider_message_id", { type: Sequelize.STRING(190), allowNull: true });
    await addCol("campaign_recipients", "sent_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("campaign_recipients", "last_event_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("campaign_recipients", "error", { type: Sequelize.STRING(255), allowNull: true });

    // programs.view permission + grants
    const [[existing]] = await queryInterface.sequelize.query("SELECT id FROM `permissions` WHERE `key` = 'programs.view'");
    const now = new Date();
    let permId = existing?.id;
    if (!permId) {
      await queryInterface.bulkInsert("permissions", [{ key: "programs.view", module: "training", description: "View the program catalogue and batches", created_at: now, updated_at: now }]);
      const [[row]] = await queryInterface.sequelize.query("SELECT id FROM `permissions` WHERE `key` = 'programs.view'");
      permId = row.id;
    }
    for (const roleKey of READERS) {
      const [[role]] = await queryInterface.sequelize.query("SELECT id FROM `roles` WHERE `key` = :k", { replacements: { k: roleKey } });
      if (!role) continue;
      const [have] = await queryInterface.sequelize.query("SELECT 1 FROM `role_permissions` WHERE role_id = :r AND permission_id = :p", { replacements: { r: role.id, p: permId } });
      if (!have.length) await queryInterface.bulkInsert("role_permissions", [{ role_id: role.id, permission_id: permId, created_at: now, updated_at: now }]);
    }
  },

  async down(queryInterface) {
    for (const t of ["contact_companies", "contact_interests", "program_batches", "programs"]) await queryInterface.dropTable(t).catch(() => {});
    const drop = async (table, col) => { const d = await queryInterface.describeTable(table); if (d[col]) await queryInterface.removeColumn(table, col); };
    for (const [t, c] of [["contacts", "is_participant"], ["contacts", "is_alumnus"], ["contacts", "alumni_since"], ["contacts", "unsubscribed_at"], ["deals", "program_id"], ["deals", "batch_id"], ["participants", "contact_id"], ["campaigns", "provider"], ["campaigns", "started_at"], ["campaigns", "error_message"], ["campaign_recipients", "provider_message_id"], ["campaign_recipients", "sent_at"], ["campaign_recipients", "last_event_at"], ["campaign_recipients", "error"]]) await drop(t, c);
    await queryInterface.sequelize.query("DELETE rp FROM `role_permissions` rp JOIN `permissions` p ON p.id = rp.permission_id WHERE p.`key` = 'programs.view'");
    await queryInterface.sequelize.query("DELETE FROM `permissions` WHERE `key` = 'programs.view'");
  },
};
