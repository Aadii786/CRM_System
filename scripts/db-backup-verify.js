"use strict";
/**
 * Tested restore (GO-2):  npm run db:backup:verify
 * Takes a fresh backup, restores it into a scratch database, compares the row count of every table with the live
 * database, then removes the scratch database. Exit code 0 only when every table matches.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { connect } = require("./lib-db");
const { restore } = require("./db-restore");

async function counts(conn) {
  const [tables] = await conn.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'");
  const out = {};
  for (const { t } of tables) out[t] = Number((await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0][0].n);
  return out;
}

async function main() {
  const dir = path.resolve("backups");
  execFileSync(process.execPath, [path.resolve(__dirname, "db-backup.js"), "--out", dir], { stdio: "inherit" });
  const file = fs.readdirSync(dir).filter((f) => f.endsWith(".sql.gz")).sort().pop();
  const scratch = `${process.env.DB_NAME || "crm_platform"}_restore_check`;
  const t0 = Date.now();
  await restore(path.join(dir, file), scratch);
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const live = await connect(), copy = await connect(scratch);
  const [a, b] = [await counts(live), await counts(copy)];
  const bad = Object.keys(a).filter((t) => a[t] !== b[t]).concat(Object.keys(b).filter((t) => !(t in a)));
  await live.end(); await copy.end();
  const root = await connect(undefined);
  await root.query(`DROP DATABASE \`${scratch}\``);
  await root.end();
  const rows = Object.values(a).reduce((x, y) => x + y, 0);
  if (bad.length) { console.error(`RESTORE CHECK FAILED. Tables that differ: ${bad.join(", ")}`); process.exit(1); }
  console.log(`RESTORE CHECK PASSED: ${Object.keys(a).length} tables, ${rows} rows restored into a scratch database in ${seconds}s and matched the live database. Scratch database removed.`);
}
main().catch((e) => { console.error("Restore check failed:", e.message); process.exit(1); });
