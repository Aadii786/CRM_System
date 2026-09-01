"use strict";

const { DEPARTMENTS } = require("../../constants/departments");

/**
 * Per-department campaign sender identity (requirement: every department -
 * Marketing, IKL/HSM, and any future department added to the data-driven
 * catalog - sends campaigns from its own name/email/reply-to instead of one
 * shared university address). Idempotent backfill so it's safe to re-run
 * against an already-seeded database.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("departments");
    if (!table.sender_name) {
      await queryInterface.addColumn("departments", "sender_name", { type: Sequelize.STRING(150), allowNull: true });
    }
    if (!table.sender_email) {
      await queryInterface.addColumn("departments", "sender_email", { type: Sequelize.STRING(190), allowNull: true });
    }
    if (!table.reply_to) {
      await queryInterface.addColumn("departments", "reply_to", { type: Sequelize.STRING(190), allowNull: true });
    }

    // Backfill known departments only where not already set, so any value
    // an admin has already saved through the app is never overwritten.
    for (const d of DEPARTMENTS) {
      await queryInterface.sequelize.query(
        `UPDATE \`departments\`
         SET sender_name = COALESCE(sender_name, :senderName),
             sender_email = COALESCE(sender_email, :senderEmail),
             reply_to = COALESCE(reply_to, :replyTo)
         WHERE \`key\` = :key`,
        { replacements: { key: d.key, senderName: d.senderName, senderEmail: d.senderEmail, replyTo: d.replyTo } }
      );
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("departments");
    if (table.sender_name) await queryInterface.removeColumn("departments", "sender_name");
    if (table.sender_email) await queryInterface.removeColumn("departments", "sender_email");
    if (table.reply_to) await queryInterface.removeColumn("departments", "reply_to");
  },
};
