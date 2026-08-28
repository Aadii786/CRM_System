"use strict";

// MySQL's bulkInsert doesn't reliably hand back generated auto-increment
// ids across every row, so seeders that need to wire up foreign keys
// re-query by a unique column (usually `key` or `email`) immediately
// after inserting. Centralizing that here keeps every seeder consistent.
async function idMapByColumn(queryInterface, table, column = "key") {
  // Backtick-quote the column: several callers pass `key`, which is a
  // reserved word in MySQL and breaks an unquoted SELECT.
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id, \`${column}\` FROM \`${table}\``
  );
  const map = {};
  for (const row of rows) {
    map[row[column]] = row.id;
  }
  return map;
}

module.exports = { idMapByColumn };
