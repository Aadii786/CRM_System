"use strict";

// Insert a single row and return its generated id. Used for small tables
// (e.g. automation node trees) where we need the id of a just-inserted
// parent row to link its children, and MySQL's bulkInsert doesn't reliably
// return generated ids for a whole batch.
async function insertOne(queryInterface, table, row) {
  await queryInterface.bulkInsert(table, [row], {});
  const [[{ id }]] = await queryInterface.sequelize.query("SELECT LAST_INSERT_ID() as id");
  return id;
}

module.exports = { insertOne };
