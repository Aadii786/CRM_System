"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("deals", "reference_number", {
      type: Sequelize.STRING(30),
      allowNull: true, // always populated by the app (seeder + dealService.createDeal),
                        // left nullable at the DB level so a unique index still
                        // allows this migration to run against a table that may
                        // already have rows (backfilled below) without any
                        // ordering dependency on when the seeder runs.
    });
    await queryInterface.addIndex("deals", ["reference_number"], {
      unique: true,
      name: "deals_reference_number_unique",
    });

    // Backfill any deals that already existed before this migration (e.g.
    // seeded before the reference-number feature existed), numbered per
    // department per year in id order.
    await queryInterface.sequelize.query(`
      UPDATE deals d
      JOIN (
        SELECT
          id,
          department_id,
          YEAR(created_at) AS yr,
          ROW_NUMBER() OVER (PARTITION BY department_id, YEAR(created_at) ORDER BY id) AS rn
        FROM deals
      ) x ON x.id = d.id
      JOIN departments dep ON dep.id = d.department_id
      SET d.reference_number = CONCAT(
        CASE dep.\`key\`
          WHEN 'ikl-hsm' THEN 'IKL'
          WHEN 'marketing' THEN 'MKT'
          ELSE UPPER(LEFT(dep.\`key\`, 3))
        END,
        '-', x.yr, '-', LPAD(x.rn, 4, '0')
      )
      WHERE d.reference_number IS NULL;
    `);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex("deals", "deals_reference_number_unique");
    await queryInterface.removeColumn("deals", "reference_number");
  },
};
