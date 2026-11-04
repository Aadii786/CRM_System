"use strict";

/**
 * The department is simply "IKL" (the "HSM" suffix is dropped everywhere the
 * user can see it). Internal keys (ikl-hsm, IKL_HSM_*) stay as they are so
 * nothing that depends on them breaks; only the display names change:
 * department name and sender name, the two pilot role names, the demo users'
 * job titles, and the sender name already stored on existing campaigns.
 * Idempotent.
 */
module.exports = {
  async up(queryInterface) {
    const q = (sql, replacements = {}) => queryInterface.sequelize.query(sql, { replacements });
    await q("UPDATE `departments` SET `name` = 'IKL' WHERE `key` = 'ikl-hsm'");
    await q("UPDATE `departments` SET `sender_name` = 'IKL Corporate Training' WHERE `key` = 'ikl-hsm' AND `sender_name` LIKE 'IKL/HSM%'");
    await q("UPDATE `roles` SET `name` = 'IKL Head of Department', `description` = 'Runs IKL: companies, deals, programs, proposals (approves them), invoice references, team and reports.' WHERE `key` = 'IKL_HSM_MANAGER'");
    await q("UPDATE `roles` SET `name` = 'IKL Sales', `description` = 'Operational IKL access: leads, companies, deals, proposals, invoice references and programs, without delete or admin rights.' WHERE `key` = 'IKL_HSM_EXECUTIVE'");
    await q("UPDATE `users` SET `job_title` = 'Head of Department' WHERE `job_title` = 'IKL/HSM Manager'");
    await q("UPDATE `users` SET `job_title` = 'Sales' WHERE `job_title` = 'IKL/HSM Executive'");
    await q("UPDATE `campaigns` SET `sender_name` = 'IKL Corporate Training' WHERE `sender_name` LIKE 'IKL/HSM%'");
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q("UPDATE `departments` SET `name` = 'IKL / HSM', `sender_name` = 'IKL/HSM Corporate Training' WHERE `key` = 'ikl-hsm'");
    await q("UPDATE `roles` SET `name` = 'IKL/HSM Manager' WHERE `key` = 'IKL_HSM_MANAGER'");
    await q("UPDATE `roles` SET `name` = 'IKL/HSM Executive' WHERE `key` = 'IKL_HSM_EXECUTIVE'");
  },
};
