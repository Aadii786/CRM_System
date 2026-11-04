"use strict";

/** Adds "failed" (the provider refused or errored for this recipient) to campaign_recipients.status. Idempotent. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE `campaign_recipients` MODIFY COLUMN `status` ENUM('queued','sent','delivered','opened','clicked','bounced','unsubscribed','failed') NOT NULL DEFAULT 'queued'"
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query("UPDATE `campaign_recipients` SET `status` = 'bounced' WHERE `status` = 'failed'");
    await queryInterface.sequelize.query(
      "ALTER TABLE `campaign_recipients` MODIFY COLUMN `status` ENUM('queued','sent','delivered','opened','clicked','bounced','unsubscribed') NOT NULL DEFAULT 'queued'"
    );
  },
};
