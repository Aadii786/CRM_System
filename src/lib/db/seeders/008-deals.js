"use strict";

const { createRng, pick, pickWeighted, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const { LEAD_SOURCES } = require("../../constants/crm");

const TRAINING_TYPES_FOR_DEALS = ["ODC", "OB", "OEP", "CP"];

function futureDateWithinDays(rng, maxDays) {
  const days = intBetween(rng, -20, maxDays);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  async up(queryInterface) {
    const rng = createRng(555);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const iklOwners = [userIds["ikl.manager@university.edu.pk"], userIds["ikl.exec@university.edu.pk"]];

    const [pipelines] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM pipelines"
    );
    const [stages] = await queryInterface.sequelize.query(
      "SELECT id, pipeline_id, `key`, `order`, is_won, is_lost, probability FROM pipeline_stages ORDER BY pipeline_id, `order`"
    );
    const [companies] = await queryInterface.sequelize.query(
      `SELECT id, name FROM companies WHERE department_id = ${departmentIds["ikl-hsm"]}`
    );
    const [contacts] = await queryInterface.sequelize.query(
      `SELECT id, company_id FROM contacts WHERE department_id = ${departmentIds["ikl-hsm"]} AND company_id IS NOT NULL`
    );

    const contactsByCompany = {};
    for (const c of contacts) {
      (contactsByCompany[c.company_id] ||= []).push(c.id);
    }

    const trainingPipeline = pipelines.find((p) => p.key === "ikl-training");
    const consultancyPipeline = pipelines.find((p) => p.key === "ikl-consultancy");
    const trainingStages = stages.filter((s) => s.pipeline_id === trainingPipeline.id);
    const consultancyStages = stages.filter((s) => s.pipeline_id === consultancyPipeline.id);

    const rows = [];

    function makeDeal(pipeline, stage, trainingType) {
      const company = pick(rng, companies);
      const companyContacts = contactsByCompany[company.id] || [];
      const contactId = companyContacts.length ? pick(rng, companyContacts) : null;
      const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";
      const value = intBetween(rng, 150000, 4500000);

      rows.push({
        name: `${company.name} - ${trainingType || "Consultancy"} Engagement`,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        company_id: company.id,
        contact_id: contactId,
        owner_id: pick(rng, iklOwners),
        department_id: departmentIds["ikl-hsm"],
        value,
        probability: stage.probability,
        expected_close_date: futureDateWithinDays(rng, 90),
        closed_at: status !== "open" ? dateWithinDays(rng, 60) : null,
        source: pick(rng, LEAD_SOURCES),
        training_type: trainingType,
        status,
        last_activity_at: dateWithinDays(rng, 30),
        created_at: dateWithinDays(rng, 300, 5),
        updated_at: now,
      });
    }

    // Weighted stage distribution: more deals sit early in the funnel than
    // at the very end, which is what makes the pipeline/funnel charts read
    // as a believable, realistic B2B pipeline rather than a flat spread.
    const stageWeight = (order, total) => Math.max(3, total - order);

    for (let i = 0; i < 180; i++) {
      const stage = pickWeighted(
        rng,
        trainingStages.map((s) => ({ value: s, weight: stageWeight(s.order, trainingStages.length) }))
      );
      makeDeal(trainingPipeline, stage, pick(rng, TRAINING_TYPES_FOR_DEALS));
    }

    for (let i = 0; i < 40; i++) {
      const stage = pickWeighted(
        rng,
        consultancyStages.map((s) => ({ value: s, weight: stageWeight(s.order, consultancyStages.length) }))
      );
      makeDeal(consultancyPipeline, stage, "Consultancy");
    }

    await queryInterface.bulkInsert("deals", rows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("deals", null, {});
  },
};
