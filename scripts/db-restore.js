"use strict";
/**
 * Restore a backup (GO-2):  npm run db:restore -- <file.sql.gz> [--into <database>] [--yes]
 * Without --into it restores over the database in .env (it asks for --yes first, because it replaces every table).
 * Use --into crm_restore_check to try a backup in a scratch database; the database is created if it does not exist.
 */
const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");
const { connect, settings, mysql } = require("./lib-db");

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };

async function restore(file, database) {
  const root = await mysql.createConnection({ ...settings(undefined), database: undefined });
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
  await root.end();
  const conn = await connect(database);
  const lines = readline.createInterface({ input: fs.createReadStream(file).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let statements = 0;
  for await (const line of lines) {
    if (!line.trim() || line.startsWith("--")) continue;
    await conn.query(line);
    statements++;
  }
  await conn.end();
  return statements;
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) { console.error("Usage: npm run db:restore -- <backup.sql.gz> [--into <database>] [--yes]"); process.exit(1); }
  const database = arg("--into") || process.env.DB_NAME || "crm_platform";
  if (!arg("--into") && !process.argv.includes("--yes")) { console.error(`This replaces every table in "${database}". Run again with --yes to confirm, or restore into a scratch database with --into <name>.`); process.exit(1); }
  const n = await restore(file, database);
  console.log(`Restored ${file} into "${database}" (${n} statements).`);
}
if (require.main === module) main().catch((e) => { console.error("Restore failed:", e.message); process.exit(1); });
module.exports = { restore };
