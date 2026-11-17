"use strict";

/**
 * Sprint 3 (IKL): registrations / attendance / completion / feedback for open
 * enrollment batches, website form capture, WhatsApp campaigns + inbound
 * replies, automations that run on a scheduler, and follow-up reminders.
 * Idempotent (safe to run on a database that already has some of it).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map((t) => (typeof t === "string" ? t : t.tableName));
    const has = (t) => tables.includes(t);
    const addCol = async (table, name, def) => {
      const d = await queryInterface.describeTable(table);
      if (!d[name]) await queryInterface.addColumn(table, name, def);
    };
    const addIdx = async (table, fields, options) => {
      try {
        await queryInterface.addIndex(table, fields, options);
      } catch (err) {
        if (!/Duplicate key name/i.test(String(err?.message))) throw err;
      }
    };
    const now = Sequelize.literal("CURRENT_TIMESTAMP");
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    };

    // One row per person per batch. Company nominations are several rows that share nomination_ref.
    if (!has("registrations")) {
      await queryInterface.createTable("registrations", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        department_id: { type: Sequelize.INTEGER, allowNull: false },
        program_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "programs", key: "id" }, onDelete: "CASCADE" },
        batch_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "program_batches", key: "id" }, onDelete: "CASCADE" },
        contact_id: { type: Sequelize.BIGINT, allowNull: false, references: { model: "contacts", key: "id" }, onDelete: "CASCADE" },
        company_id: { type: Sequelize.INTEGER, allowNull: true },
        nomination_ref: { type: Sequelize.STRING(40), allowNull: true },
        source: { type: Sequelize.STRING(30), allowNull: false, defaultValue: "Manual" },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Registered" },
        attendance: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Registered" },
        fee: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        payment_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Unpaid" },
        amount_paid: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        invoice_number: { type: Sequelize.STRING(60), allowNull: true },
        completion_status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "In progress" },
        completed_at: { type: Sequelize.DATEONLY, allowNull: true },
        certificate_issued: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        certificate_number: { type: Sequelize.STRING(60), allowNull: true },
        certificate_date: { type: Sequelize.DATEONLY, allowNull: true },
        feedback_score: { type: Sequelize.TINYINT, allowNull: true },
        feedback_comments: { type: Sequelize.TEXT, allowNull: true },
        feedback_at: { type: Sequelize.DATE, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await addIdx("registrations", ["batch_id", "contact_id"], { name: "registrations_batch_contact", unique: true });
      await addIdx("registrations", ["department_id", "status"], { name: "registrations_department_status" });
      await addIdx("registrations", ["contact_id"], { name: "registrations_contact" });
      await addIdx("registrations", ["company_id"], { name: "registrations_company" });
      await addIdx("registrations", ["program_id"], { name: "registrations_program" });
    }

    // Every call from the website lands here first, so nothing is lost and staff can see what came in.
    if (!has("form_submissions")) {
      await queryInterface.createTable("form_submissions", {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        department_id: { type: Sequelize.INTEGER, allowNull: false },
        form_type: { type: Sequelize.STRING(30), allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "Processed" },
        contact_id: { type: Sequelize.BIGINT, allowNull: true },
        registration_id: { type: Sequelize.INTEGER, allowNull: true },
        is_new_contact: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        source_page: { type: Sequelize.STRING(255), allowNull: true },
        payload: { type: Sequelize.JSON, allowNull: true },
        error: { type: Sequelize.STRING(255), allowNull: true },
        api_key_id: { type: Sequelize.INTEGER, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
      await addIdx("form_submissions", ["department_id", "created_at"], { name: "form_submissions_department_created" });
      await addIdx("form_submissions", ["contact_id"], { name: "form_submissions_contact" });
    }

    // The website's key belongs to one department.
    await addCol("api_keys", "department_id", { type: Sequelize.INTEGER, allowNull: true });

    // WhatsApp campaigns share the campaign tables with email.
    await addCol("campaigns", "channel", { type: Sequelize.STRING(20), allowNull: false, defaultValue: "email" });
    await addCol("campaigns", "message_body", { type: Sequelize.TEXT, allowNull: true });
    await addCol("campaigns", "template_name", { type: Sequelize.STRING(100), allowNull: true });
    await addCol("messages", "provider_message_id", { type: Sequelize.STRING(190), allowNull: true });
    await addCol("messages", "campaign_id", { type: Sequelize.INTEGER, allowNull: true });

    // Automations that run by themselves.
    await addCol("automation_executions", "next_run_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("automation_executions", "context", { type: Sequelize.JSON, allowNull: true });
    await addIdx("automation_executions", ["status", "next_run_at"], { name: "automation_executions_due" });
    await addIdx("automation_executions", ["automation_id", "contact_id"], { name: "automation_executions_automation_contact" });

    // Follow-up reminders (sent once per task / meeting).
    await addCol("tasks", "reminder_sent_at", { type: Sequelize.DATE, allowNull: true });
    await addCol("meetings", "reminder_sent_at", { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    for (const t of ["form_submissions", "registrations"]) await queryInterface.dropTable(t).catch(() => {});
    const drop = async (table, col) => {
      const d = await queryInterface.describeTable(table);
      if (d[col]) await queryInterface.removeColumn(table, col);
    };
    for (const [t, c] of [
      ["api_keys", "department_id"], ["campaigns", "channel"], ["campaigns", "message_body"], ["campaigns", "template_name"],
      ["messages", "provider_message_id"], ["messages", "campaign_id"], ["automation_executions", "next_run_at"],
      ["automation_executions", "context"], ["tasks", "reminder_sent_at"], ["meetings", "reminder_sent_at"],
    ]) await drop(t, c);
  },
};
