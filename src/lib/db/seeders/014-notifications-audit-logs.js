"use strict";

const { createRng, pick, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");

module.exports = {
  async up(queryInterface) {
    const rng = createRng(88);
    const now = new Date();
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const emails = Object.keys(userIds);

    const NOTIF_TEMPLATES = [
      { type: "lead_qualified", title: "New qualified lead", body: "A contact just crossed the qualification threshold." },
      { type: "deal_stage", title: "Deal moved to Proposal Sent", body: "A deal in your pipeline advanced a stage." },
      { type: "payment_overdue", title: "Payment overdue", body: "An invoice payment is past its due date." },
      { type: "campaign_completed", title: "Campaign completed", body: "Your scheduled campaign finished sending." },
      { type: "automation_converted", title: "Automation converted 24 leads", body: "The nurture automation just converted a batch of leads." },
      { type: "whatsapp_reply", title: "WhatsApp reply received", body: "A contact replied on WhatsApp and needs a response." },
      { type: "task_overdue", title: "Task overdue", body: "One of your tasks passed its due date." },
    ];

    const notificationRows = [];
    for (const email of emails) {
      const count = 3;
      for (let i = 0; i < count; i++) {
        const t = pick(rng, NOTIF_TEMPLATES);
        notificationRows.push({
          user_id: userIds[email],
          type: t.type,
          title: t.title,
          body: t.body,
          link: null,
          is_read: i > 0,
          created_at: dateWithinDays(rng, 14),
        });
      }
    }
    await queryInterface.bulkInsert("notifications", notificationRows, {});

    const AUDIT_TEMPLATES = [
      { action: "Imported contacts", module: "contacts", email: "marketing.manager@university.edu.pk" },
      { action: "Created campaign", module: "campaigns", email: "marketing.exec@university.edu.pk" },
      { action: "Launched automation", module: "automations", email: "marketing.manager@university.edu.pk" },
      { action: "Moved deal to Proposal Sent", module: "deals", email: "ikl.exec@university.edu.pk" },
      { action: "Created company", module: "companies", email: "ikl.manager@university.edu.pk" },
      { action: "Viewed Executive Dashboard", module: "executive", email: "rector@university.edu.pk" },
      { action: "Changed Marketing User permissions", module: "roles", email: "admin@university.edu.pk" },
      { action: "Updated settings", module: "settings", email: "admin@university.edu.pk" },
      { action: "Recorded payment", module: "invoices", email: "ikl.manager@university.edu.pk" },
      { action: "Assigned WhatsApp conversation", module: "conversations", email: "marketing.exec@university.edu.pk" },
    ];
    const auditRows = AUDIT_TEMPLATES.map((a, idx) => ({
      user_id: userIds[a.email] || null,
      action: a.action,
      module: a.module,
      resource_type: null,
      resource_id: null,
      department_id: null,
      metadata: null,
      result: "success",
      ip_address: "127.0.0.1",
      user_agent: "seed-script",
      created_at: dateWithinDays(rng, 10),
    }));
    await queryInterface.bulkInsert("audit_logs", auditRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("audit_logs", null, {});
    await queryInterface.bulkDelete("notifications", null, {});
  },
};
