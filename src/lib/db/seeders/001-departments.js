"use strict";

const { DEPARTMENTS } = require("../../constants/departments");
const { idMapByColumn } = require("./lib/lookup");

// Idempotent: only departments that do not exist yet (by key) are inserted.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const existing = await idMapByColumn(queryInterface, "departments", "key");
    const missing = DEPARTMENTS.filter((d) => !existing[d.key]);
    if (!missing.length) return;
    await queryInterface.bulkInsert(
      "departments",
      missing.map((d) => ({
        key: d.key,
        name: d.name,
        description: d.description,
        is_university_wide: d.isUniversityWide,
        sender_name: d.senderName,
        sender_email: d.senderEmail,
        reply_to: d.replyTo,
        is_active: true,
        created_at: now,
        updated_at: now,
      })),
      {}
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("departments", null, {});
  },
};
