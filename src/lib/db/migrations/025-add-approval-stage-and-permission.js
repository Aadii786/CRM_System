"use strict";

// Data migration for databases already seeded before the approval gate
// existed: inserts the "Approval" pipeline stage between Accepted and
// Execution (shifting later stages' order by 1), adds the deals.approve
// permission, and grants it to the IKL/HSM Manager role. A fresh seed
// picks all of this up automatically from constants/permissions.js,
// constants/roles.js and constants/crm.js.
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // --- Pipeline stage ---
    const [pipelines] = await queryInterface.sequelize.query(
      "SELECT id FROM pipelines WHERE `key` = 'ikl-training' LIMIT 1"
    );
    const pipeline = pipelines[0];
    if (pipeline) {
      const [existingStage] = await queryInterface.sequelize.query(
        `SELECT id FROM pipeline_stages WHERE pipeline_id = ${pipeline.id} AND \`key\` = 'approval' LIMIT 1`
      );
      if (existingStage.length === 0) {
        const [acceptedRows] = await queryInterface.sequelize.query(
          `SELECT \`order\` FROM pipeline_stages WHERE pipeline_id = ${pipeline.id} AND \`key\` = 'accepted' LIMIT 1`
        );
        if (acceptedRows.length > 0) {
          const acceptedOrder = acceptedRows[0].order;
          await queryInterface.sequelize.query(
            `UPDATE pipeline_stages SET \`order\` = \`order\` + 1 WHERE pipeline_id = ${pipeline.id} AND \`order\` > ${acceptedOrder}`
          );
          await queryInterface.bulkInsert("pipeline_stages", [
            {
              pipeline_id: pipeline.id,
              key: "approval",
              name: "Approval",
              order: acceptedOrder + 1,
              probability: 80,
              is_won: false,
              is_lost: false,
              created_at: now,
              updated_at: now,
            },
          ]);
        }
      }
    }

    // --- Permission ---
    const [existingPermission] = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE `key` = 'deals.approve' LIMIT 1"
    );
    let permissionId = existingPermission[0]?.id;
    if (!permissionId) {
      await queryInterface.bulkInsert("permissions", [
        {
          key: "deals.approve",
          module: "deals",
          description: "Approve a B2B deal to proceed from Approval into Execution",
          created_at: now,
          updated_at: now,
        },
      ]);
      const [inserted] = await queryInterface.sequelize.query(
        "SELECT id FROM permissions WHERE `key` = 'deals.approve' LIMIT 1"
      );
      permissionId = inserted[0].id;
    }

    // --- Grant to IKL/HSM Manager (and Central Administrator, who should
    // always have every permission) ---
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM roles WHERE `key` IN ('IKL_HSM_MANAGER', 'CENTRAL_CRM_ADMINISTRATOR')"
    );
    for (const role of roles) {
      const [existingGrant] = await queryInterface.sequelize.query(
        `SELECT id FROM role_permissions WHERE role_id = ${role.id} AND permission_id = ${permissionId} LIMIT 1`
      );
      if (existingGrant.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          { role_id: role.id, permission_id: permissionId, created_at: now, updated_at: now },
        ]);
      }
    }
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE rp FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.`key` = 'deals.approve'"
    );
    await queryInterface.sequelize.query("DELETE FROM permissions WHERE `key` = 'deals.approve'");
    await queryInterface.sequelize.query(
      "DELETE ps FROM pipeline_stages ps JOIN pipelines p ON p.id = ps.pipeline_id WHERE p.`key` = 'ikl-training' AND ps.`key` = 'approval'"
    );
  },
};
