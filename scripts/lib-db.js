"use strict";
// Shared helpers for the backup scripts. Plain Node + mysql2 (no mysqldump needed), so they run anywhere the CRM runs.
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

const settings = (database) => ({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || undefined,
  database,
  multipleStatements: false,
  dateStrings: true, // dates are written exactly as stored, so a restore does not shift times
  jsonStrings: true, // JSON columns are written as text
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: "utf8mb4",
});

async function connect(database = process.env.DB_NAME || "crm_platform") {
  return mysql.createConnection(settings(database));
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\..*/, "").replace("T", "-");
module.exports = { connect, stamp, settings, mysql };
