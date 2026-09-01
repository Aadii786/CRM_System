"use strict";

const { DEPARTMENTS } = require("../../constants/departments");

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "departments",
      DEPARTMENTS.map((d) => ({
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
