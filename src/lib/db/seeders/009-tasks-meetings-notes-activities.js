"use strict";

const { createRng, pick, pickWeighted, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");

function futureOrPast(rng, spreadDays) {
  const days = intBetween(rng, -spreadDays, spreadDays);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  async up(queryInterface) {
    const rng = createRng(777);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const iklOwners = [userIds["ikl.manager@university.edu.pk"], userIds["ikl.exec@university.edu.pk"]];
    const marketingOwners = [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]];

    const [deals] = await queryInterface.sequelize.query(
      "SELECT id, name, company_id, contact_id, owner_id, stage_id, department_id FROM deals"
    );
    const [companies] = await queryInterface.sequelize.query("SELECT id, name, department_id FROM companies");
    const [topMarketingContacts] = await queryInterface.sequelize.query(
      `SELECT id, first_name, last_name, lead_score FROM contacts WHERE department_id = ${departmentIds["marketing"]} ORDER BY lead_score DESC LIMIT 600`
    );
    const [stageNames] = await queryInterface.sequelize.query("SELECT id, name FROM pipeline_stages");
    const stageNameById = Object.fromEntries(stageNames.map((s) => [s.id, s.name]));

    // ---- Tasks ----
    const taskTitlesIkl = [
      "Follow up on proposal",
      "Schedule kickoff meeting",
      "Confirm training dates with trainer",
      "Send TNA questionnaire",
      "Collect participant list",
      "Chase pending payment",
      "Prepare final proposal",
      "Share invoice with finance department",
    ];
    const taskTitlesMarketing = [
      "Follow up after webinar",
      "Send personalized WhatsApp follow-up",
      "Qualify inbound lead",
      "Schedule discovery call",
      "Re-engage inactive contact",
      "Send brochure via email",
    ];

    const taskRows = [];
    for (let i = 0; i < 220; i++) {
      const deal = pick(rng, deals);
      const overdue = rng() < 0.15;
      const status = overdue
        ? "Overdue"
        : pickWeighted(rng, [
            { value: "Pending", weight: 40 },
            { value: "In Progress", weight: 25 },
            { value: "Completed", weight: 30 },
            { value: "Cancelled", weight: 5 },
          ]);
      taskRows.push({
        title: pick(rng, taskTitlesIkl),
        description: `Related to deal: ${deal.name}`,
        owner_id: deal.owner_id,
        contact_id: deal.contact_id,
        company_id: deal.company_id,
        deal_id: deal.id,
        department_id: departmentIds["ikl-hsm"],
        due_date: overdue ? dateWithinDays(rng, 10, 1) : futureOrPast(rng, 20),
        priority: pick(rng, ["Low", "Medium", "High", "Urgent"]),
        status,
        completed_at: status === "Completed" ? dateWithinDays(rng, 10) : null,
        created_at: dateWithinDays(rng, 60),
        updated_at: now,
      });
    }
    for (let i = 0; i < 100; i++) {
      const contact = pick(rng, topMarketingContacts);
      const status = pickWeighted(rng, [
        { value: "Pending", weight: 45 },
        { value: "In Progress", weight: 20 },
        { value: "Completed", weight: 30 },
        { value: "Cancelled", weight: 5 },
      ]);
      taskRows.push({
        title: pick(rng, taskTitlesMarketing),
        description: `Related to contact: ${contact.first_name} ${contact.last_name}`,
        owner_id: pick(rng, marketingOwners),
        contact_id: contact.id,
        company_id: null,
        deal_id: null,
        department_id: departmentIds["marketing"],
        due_date: futureOrPast(rng, 15),
        priority: pick(rng, ["Low", "Medium", "High", "Urgent"]),
        status,
        completed_at: status === "Completed" ? dateWithinDays(rng, 10) : null,
        created_at: dateWithinDays(rng, 45),
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert("tasks", taskRows, {});

    // ---- Meetings ----
    const meetingRows = [];
    for (let i = 0; i < 90; i++) {
      const deal = pick(rng, deals);
      const startAt = futureOrPast(rng, 25);
      const isPast = startAt.getTime() < Date.now();
      meetingRows.push({
        title: `Meeting - ${deal.name}`,
        contact_id: deal.contact_id,
        company_id: deal.company_id,
        deal_id: deal.id,
        department_id: departmentIds["ikl-hsm"],
        owner_id: deal.owner_id,
        start_at: startAt,
        end_at: new Date(startAt.getTime() + 60 * 60 * 1000),
        location: pick(rng, ["Company Office", "University Campus - Block A", "Google Meet", "Zoom"]),
        attendees: JSON.stringify([deal.name.split(" - ")[0]]),
        notes: "Discuss training requirements and next steps.",
        outcome: isPast ? pick(rng, ["Positive - moving to proposal", "Needs follow-up", "Requirement clarified"]) : null,
        status: isPast ? "Completed" : "Scheduled",
        created_at: dateWithinDays(rng, 60),
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert("meetings", meetingRows, {});

    // ---- Notes ----
    const noteRows = [];
    for (let i = 0; i < 90; i++) {
      const deal = pick(rng, deals);
      noteRows.push({
        body: pick(rng, [
          "Client is price-sensitive, propose phased payment plan.",
          "Decision maker requested a customized outline for senior staff.",
          "Strong interest, competing with another training provider.",
          "Budget approved, awaiting finance sign-off.",
          "Requested references from previous training cohorts.",
        ]),
        contact_id: deal.contact_id,
        company_id: deal.company_id,
        deal_id: deal.id,
        author_id: deal.owner_id,
        created_at: dateWithinDays(rng, 45),
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert("notes", noteRows, {});

    // ---- Activities (unified timeline) ----
    const activityRows = [];
    for (const deal of deals) {
      activityRows.push({
        type: "deal_stage",
        title: `Deal moved to ${stageNameById[deal.stage_id]}`,
        description: null,
        contact_id: deal.contact_id,
        company_id: deal.company_id,
        deal_id: deal.id,
        user_id: deal.owner_id,
        metadata: null,
        occurred_at: dateWithinDays(rng, 30),
        created_at: now,
      });
    }
    for (const company of companies) {
      activityRows.push({
        type: "note",
        title: "Account created",
        description: `${company.name} added to CRM`,
        contact_id: null,
        company_id: company.id,
        deal_id: null,
        user_id: null,
        metadata: null,
        occurred_at: dateWithinDays(rng, 200, 30),
        created_at: now,
      });
    }
    for (const contact of topMarketingContacts.slice(0, 400)) {
      const count = intBetween(rng, 1, 4);
      for (let j = 0; j < count; j++) {
        activityRows.push({
          type: pick(rng, ["email", "email", "whatsapp", "lead_score", "status_change"]),
          title: pick(rng, [
            "Email #1 opened",
            "Email #2 clicked",
            "Lead score increased",
            "WhatsApp reply received",
            "Status changed to Interested",
          ]),
          description: null,
          contact_id: contact.id,
          company_id: null,
          deal_id: null,
          user_id: null,
          metadata: null,
          occurred_at: dateWithinDays(rng, 60),
          created_at: now,
        });
      }
    }
    await queryInterface.bulkInsert("activities", activityRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("activities", null, {});
    await queryInterface.bulkDelete("notes", null, {});
    await queryInterface.bulkDelete("meetings", null, {});
    await queryInterface.bulkDelete("tasks", null, {});
  },
};
