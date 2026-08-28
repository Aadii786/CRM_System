"use strict";

const { createRng, pick, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const { insertOne } = require("./lib/insertOne");
const { PAKISTANI_FIRST_NAMES, PAKISTANI_LAST_NAMES, JOB_TITLES } = require("./lib/nameData");

const TRAINER_SPECIALIZATIONS = [
  "Leadership Development", "Project Management", "Digital Marketing",
  "Financial Modelling", "Soft Skills & Communication", "Six Sigma / Quality",
  "HR & Talent Management", "Data Analytics", "Supply Chain Management",
  "Change Management",
];

module.exports = {
  async up(queryInterface) {
    const rng = createRng(654);
    const now = new Date();

    // ---- Trainers ----
    const trainerRows = [];
    for (let i = 0; i < 16; i++) {
      const name = `${pick(rng, PAKISTANI_FIRST_NAMES)} ${pick(rng, PAKISTANI_LAST_NAMES)}`;
      trainerRows.push({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@trainers.example.com`,
        phone: `+92-3${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}`,
        specialization: pick(rng, TRAINER_SPECIALIZATIONS),
        remuneration_rate: intBetween(rng, 15000, 60000),
        status: "Active",
        created_at: dateWithinDays(rng, 300),
        updated_at: now,
      });
    }
    await queryInterface.bulkInsert("trainers", trainerRows, {});
    const trainerIds = (await queryInterface.sequelize.query("SELECT id FROM trainers"))[0].map((r) => r.id);

    const [dealsAdvanced] = await queryInterface.sequelize.query(`
      SELECT d.id, d.name, d.company_id, d.value, d.training_type, ps.\`key\` as stage_key, ps.\`order\` as stage_order
      FROM deals d
      JOIN pipeline_stages ps ON ps.id = d.stage_id
      JOIN pipelines p ON p.id = d.pipeline_id
      WHERE p.\`key\` = 'ikl-training' AND ps.\`order\` >= 6
      ORDER BY ps.\`order\` ASC
    `);

    let invoiceSeq = 1001;

    for (const deal of dealsAdvanced) {
      // TNA for anything at "tna" stage or beyond
      const tnaId = await insertOne(queryInterface, "tnas", {
        deal_id: deal.id,
        requirement: "Assess current staff competency gaps and align training content to department needs.",
        assessment: "Skills gap identified in leadership and communication; recommend a blended program.",
        status: deal.stage_order >= 7 ? "Completed" : "In Progress",
        responsible_person: pick(rng, JOB_TITLES),
        notes: null,
        created_at: dateWithinDays(rng, 90),
        updated_at: now,
      });

      // Proposals: initial always, final once past final_proposal stage
      const initialValue = Number(deal.value) * 0.9;
      await insertOne(queryInterface, "proposals", {
        deal_id: deal.id,
        type: "Initial",
        value: initialValue,
        sent_date: dateWithinDays(rng, 60),
        status: "Sent",
        notes: null,
        created_at: dateWithinDays(rng, 60),
        updated_at: now,
      });

      let finalProposalId = null;
      if (deal.stage_order >= 8) {
        finalProposalId = await insertOne(queryInterface, "proposals", {
          deal_id: deal.id,
          type: "Final",
          value: deal.value,
          sent_date: dateWithinDays(rng, 30),
          status: deal.stage_order >= 9 ? "Accepted" : "Sent",
          notes: null,
          created_at: dateWithinDays(rng, 30),
          updated_at: now,
        });
      }

      // Training program once accepted (order >= 9)
      if (deal.stage_order >= 9) {
        const trainerId = pick(rng, trainerIds);
        const startDate = dateWithinDays(rng, 45, 0);
        const endDate = new Date(startDate.getTime() + intBetween(rng, 1, 4) * 24 * 60 * 60 * 1000);
        const programStatus = deal.stage_order >= 15 ? "Completed" : deal.stage_order >= 10 ? "In Progress" : "Planned";
        const participantsCount = intBetween(rng, 8, 35);

        const programId = await insertOne(queryInterface, "training_programs", {
          deal_id: deal.id,
          company_id: deal.company_id,
          title: deal.name,
          training_type: deal.training_type || "CP",
          trainer_id: trainerId,
          start_date: startDate,
          end_date: endDate,
          location: pick(rng, ["Company Premises", "University Campus", "Marriott Hotel, Islamabad", "Online / Zoom"]),
          status: programStatus,
          participants_count: participantsCount,
          cost: deal.value,
          feedback_score: programStatus === "Completed" ? (intBetween(rng, 38, 50) / 10) : null,
          feedback_notes: programStatus === "Completed" ? "Well received; participants requested a follow-up advanced session." : null,
          created_at: dateWithinDays(rng, 60),
          updated_at: now,
        });

        const participantRows = [];
        for (let p = 0; p < Math.min(participantsCount, 12); p++) {
          const pname = `${pick(rng, PAKISTANI_FIRST_NAMES)} ${pick(rng, PAKISTANI_LAST_NAMES)}`;
          participantRows.push({
            training_program_id: programId,
            name: pname,
            designation: pick(rng, JOB_TITLES),
            organization: deal.name.split(" - ")[0],
            email: `${pname.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            phone: `+92-3${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}`,
            attendance: programStatus === "Completed" ? pick(rng, ["Attended", "Attended", "Attended", "No Show"]) : "Registered",
            created_at: now,
            updated_at: now,
          });
        }
        await queryInterface.bulkInsert("participants", participantRows, {});

        if (programStatus === "Completed") {
          await insertOne(queryInterface, "trainer_remunerations", {
            training_program_id: programId,
            trainer_id: trainerId,
            amount: Number(deal.value) * 0.12,
            status: pick(rng, ["Paid", "Paid", "Pending"]),
            paid_at: dateWithinDays(rng, 20),
            created_at: dateWithinDays(rng, 20),
            updated_at: now,
          });
        }
      }

      // Invoices once at invoice stage or later
      if (deal.stage_order >= 12) {
        const amount = deal.value;
        const paidStage = deal.stage_order >= 14;
        const partialStage = deal.stage_order === 13;
        const paidAmount = paidStage ? amount : partialStage ? Number(amount) * 0.5 : 0;
        const invoiceId = await insertOne(queryInterface, "invoices", {
          deal_id: deal.id,
          proposal_id: finalProposalId,
          invoice_number: `INV-${invoiceSeq++}`,
          amount,
          paid_amount: paidAmount,
          status: paidStage ? "Paid" : partialStage ? "Partial" : "Unpaid",
          issue_date: dateWithinDays(rng, 25),
          due_date: dateWithinDays(rng, -10, -40),
          created_at: dateWithinDays(rng, 25),
          updated_at: now,
        });

        if (paidAmount > 0) {
          await queryInterface.bulkInsert("payments", [{
            invoice_id: invoiceId,
            amount: paidAmount,
            method: pick(rng, ["Bank Transfer", "Cheque", "Online Transfer"]),
            reference: `PMT-${intBetween(rng, 10000, 99999)}`,
            paid_at: dateWithinDays(rng, 15),
            created_at: now,
          }], {});
        }
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("payments", null, {});
    await queryInterface.bulkDelete("invoices", null, {});
    await queryInterface.bulkDelete("trainer_remunerations", null, {});
    await queryInterface.bulkDelete("participants", null, {});
    await queryInterface.bulkDelete("training_programs", null, {});
    await queryInterface.bulkDelete("proposals", null, {});
    await queryInterface.bulkDelete("tnas", null, {});
    await queryInterface.bulkDelete("trainers", null, {});
  },
};
