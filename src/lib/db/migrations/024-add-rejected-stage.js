"use strict";

// Data migration: adds the "Rejected" stage to the Training Pipeline for
// databases that were already seeded before this stage existed. A fresh
// seed picks this up automatically from constants/crm.js - this only
// backfills existing installations.
module.exports = {
  async up(queryInterface) {
    const [pipelines] = await queryInterface.sequelize.query(
      "SELECT id FROM pipelines WHERE `key` = 'ikl-training' LIMIT 1"
    );
    const pipeline = pipelines[0];
    if (!pipeline) return; // nothing seeded yet - fresh seed will create it correctly

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM pipeline_stages WHERE pipeline_id = ${pipeline.id} AND \`key\` = 'rejected' LIMIT 1`
    );
    if (existing.length > 0) return; // already present, don't duplicate

    const [[{ maxOrder }]] = await queryInterface.sequelize.query(
      `SELECT COALESCE(MAX(\`order\`), -1) as maxOrder FROM pipeline_stages WHERE pipeline_id = ${pipeline.id}`
    );

    const now = new Date();
    await queryInterface.bulkInsert("pipeline_stages", [
      {
        pipeline_id: pipeline.id,
        key: "rejected",
        name: "Rejected",
        order: maxOrder + 1,
        probability: 0,
        is_won: false,
        is_lost: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE ps FROM pipeline_stages ps JOIN pipelines p ON p.id = ps.pipeline_id WHERE p.`key` = 'ikl-training' AND ps.`key` = 'rejected'"
    );
  },
};
