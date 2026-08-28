"use strict";

const { createRng, pick, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const { insertOne } = require("./lib/insertOne");

const INBOUND_SAMPLES = [
  "Hi, I saw your email about the training program. Can you share more details?",
  "Yes, I'm interested. What are the upcoming dates?",
  "What is the fee structure for this program?",
  "Can we schedule a call this week?",
  "Thank you, please send the brochure.",
  "Is there a discount for group registrations?",
];
const OUTBOUND_SAMPLES = [
  "Hello! Thanks for your interest. Here's a quick overview of the program.",
  "Sure, I can share the full schedule - one moment.",
  "The program fee is PKR 45,000 per participant, with group discounts available.",
  "I've assigned this to our team, they'll call you shortly.",
  "Sending the brochure right now, please check your inbox too.",
];

module.exports = {
  async up(queryInterface) {
    const rng = createRng(444);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const owners = {
      marketing: [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]],
      "ikl-hsm": [userIds["ikl.manager@university.edu.pk"], userIds["ikl.exec@university.edu.pk"]],
    };

    for (const deptKey of ["marketing", "ikl-hsm"]) {
      const [contacts] = await queryInterface.sequelize.query(
        `SELECT id, first_name FROM contacts WHERE department_id = ${departmentIds[deptKey]} AND whatsapp_number IS NOT NULL ORDER BY lead_score DESC LIMIT 60`
      );
      for (const contact of contacts) {
        const status = pick(rng, ["open", "assigned", "assigned", "closed"]);
        const assignedTo = status === "open" ? null : pick(rng, owners[deptKey]);
        const messageCount = intBetween(rng, 2, 6);
        const lastMessage = pick(rng, [...INBOUND_SAMPLES, ...OUTBOUND_SAMPLES]);

        const conversationId = await insertOne(queryInterface, "conversations", {
          contact_id: contact.id,
          channel: "whatsapp",
          status,
          assigned_to: assignedTo,
          department_id: departmentIds[deptKey],
          last_message_at: dateWithinDays(rng, 10),
          last_message_preview: lastMessage.slice(0, 120),
          unread_count: status === "open" ? intBetween(rng, 1, 3) : 0,
          created_at: dateWithinDays(rng, 30),
          updated_at: now,
        });

        const messageRows = [];
        let t = dateWithinDays(rng, 15).getTime();
        for (let i = 0; i < messageCount; i++) {
          const inbound = i % 2 === 0;
          t += intBetween(rng, 5, 90) * 60 * 1000;
          messageRows.push({
            conversation_id: conversationId,
            direction: inbound ? "inbound" : "outbound",
            sender_type: inbound ? "contact" : "user",
            sender_id: inbound ? null : assignedTo,
            body: inbound ? pick(rng, INBOUND_SAMPLES) : pick(rng, OUTBOUND_SAMPLES),
            status: "delivered",
            sent_at: new Date(t),
            created_at: now,
          });
        }
        await queryInterface.bulkInsert("messages", messageRows, {});
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("messages", null, {});
    await queryInterface.bulkDelete("conversations", null, {});
  },
};
