"use strict";

const {
  IKL_HSM_PIPELINE_STAGES,
  CONSULTANCY_PIPELINE_STAGES,
} = require("../../constants/crm");
const { idMapByColumn } = require("./lib/lookup");

const TAGS = [
  { name: "VIP", color: "#DC2626" },
  { name: "Hot Lead", color: "#EA580C" },
  { name: "Newsletter", color: "#2563EB" },
  { name: "Alumni", color: "#7C3AED" },
  { name: "Government", color: "#0F766E" },
  { name: "Repeat Client", color: "#16A34A" },
  { name: "Needs Follow-up", color: "#CA8A04" },
  { name: "Do Not Contact", color: "#6B7280" },
];

const PIPELINES = [
  { key: "ikl-training", name: "Training Pipeline", departmentKey: "ikl-hsm", isDefault: true, stages: IKL_HSM_PIPELINE_STAGES },
  { key: "ikl-consultancy", name: "Consultancy Pipeline", departmentKey: "ikl-hsm", isDefault: false, stages: CONSULTANCY_PIPELINE_STAGES },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "tags",
      TAGS.map((t) => ({ name: t.name, color: t.color, created_at: now, updated_at: now })),
      {}
    );

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");

    await queryInterface.bulkInsert(
      "pipelines",
      PIPELINES.map((p) => ({
        key: p.key,
        name: p.name,
        department_id: departmentIds[p.departmentKey],
        is_default: p.isDefault,
        created_at: now,
        updated_at: now,
      })),
      {}
    );

    const pipelineIds = await idMapByColumn(queryInterface, "pipelines", "key");

    const stageRows = [];
    for (const pipeline of PIPELINES) {
      pipeline.stages.forEach((stage, index) => {
        stageRows.push({
          pipeline_id: pipelineIds[pipeline.key],
          key: stage.key,
          name: stage.name,
          order: index,
          probability: stage.probability,
          is_won: Boolean(stage.isWon),
          is_lost: Boolean(stage.isLost),
          created_at: now,
          updated_at: now,
        });
      });
    }
    await queryInterface.bulkInsert("pipeline_stages", stageRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("pipeline_stages", null, {});
    await queryInterface.bulkDelete("pipelines", null, {});
    await queryInterface.bulkDelete("tags", null, {});
  },
};
