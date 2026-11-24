"use strict";
/**
 * Go-live cleanup (GO-4):  npm run golive:cleanup
 * Removes the demonstration data (contacts, companies, deals, campaigns, programs, registrations, documents, history, ...)
 * so that only IKL's own data remains, and keeps the set-up (departments, roles and permissions, pipeline stages,
 * settings, integrations, tags, users).
 *
 *   npm run golive:cleanup                                   dry run: shows what would be deleted, changes nothing
 *   npm run golive:cleanup -- --confirm-database <name>      really deletes (type the database name shown in the dry run)
 *     --disable-demo-users   also disables the one-click demo accounts (needs at least one other active user)
 *     --no-backup            skip the automatic backup that is taken first (not recommended)
 *
 * Every table must be listed below as KEEP or WIPE; a table that is in neither stops the script, so a new table
 * can never be deleted (or kept) by accident.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { connect, stamp } = require("./lib-db");

const KEEP = ["sequelizemeta", "departments", "permissions", "roles", "role_permissions", "user_roles", "users", "pipelines", "pipeline_stages", "settings", "integrations", "tags", "custom_objects", "custom_fields", "api_keys", "webhooks"];
const WIPE = [
  "activities", "audit_logs", "automation_execution_logs", "automation_executions", "automation_nodes", "automations", "campaign_events", "campaign_recipients", "campaigns",
  "companies", "contact_companies", "contact_interests", "contact_list_members", "contact_lists", "list_folders", "contact_tags", "contacts", "conversations", "custom_object_records",
  "deals", "documents", "form_submissions", "import_rows", "imports", "invoices", "meetings", "messages", "notes", "notifications", "participants", "payments",
  "program_batches", "programs", "proposals", "registrations", "segment_conditions", "segments", "tasks", "tnas", "trainer_remunerations", "trainers", "training_programs",
];

const flag = (name) => process.argv.includes(name);
const value = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };

async function main() {
  const conn = await connect();
  const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
  const [rows] = await conn.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'");
  const tables = rows.map((r) => r.t);
  const actual = new Map(tables.map((t) => [t.toLowerCase(), t])); // MySQL on Linux keeps the case of "SequelizeMeta"
  const unknown = tables.filter((t) => !KEEP.includes(t.toLowerCase()) && !WIPE.includes(t.toLowerCase()));
  if (unknown.length) { console.error(`Stopped: these tables are not classified in scripts/go-live-cleanup.js: ${unknown.join(", ")}. Add each to KEEP or WIPE.`); process.exit(1); }

  const counts = {};
  for (const t of WIPE.filter((x) => actual.has(x)).map((x) => actual.get(x))) counts[t] = Number((await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``))[0][0].n);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Database: ${db} on ${process.env.DB_HOST || "localhost"}`);
  console.log("Will be emptied:");
  for (const [t, n] of Object.entries(counts)) if (n) console.log(`  ${t.padEnd(28)} ${String(n).padStart(8)} rows`);
  console.log(`  ${"TOTAL".padEnd(28)} ${String(total).padStart(8)} rows`);
  console.log(`Kept as they are: ${KEEP.filter((t) => actual.has(t)).join(", ")}`);
  const uploads = process.env.UPLOAD_DIR || path.resolve("uploads");
  console.log(`Attached files in ${uploads} will be deleted as well.`);

  if (value("--confirm-database") !== db) {
    console.log(`\nDRY RUN: nothing was changed. To delete for real, run:\n  npm run golive:cleanup -- --confirm-database ${db}`);
    await conn.end();
    return;
  }

  if (!flag("--no-backup")) {
    console.log("\nTaking a backup first...");
    execFileSync(process.execPath, [path.resolve(__dirname, "db-backup.js"), "--with-uploads"], { stdio: "inherit" });
  }

  await conn.query("SET FOREIGN_KEY_CHECKS=0");
  for (const t of Object.keys(counts)) {
    await conn.query(`DELETE FROM \`${t}\``);
    await conn.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS=1");

  let files = 0;
  if (fs.existsSync(uploads)) for (const f of fs.readdirSync(uploads)) { fs.rmSync(path.join(uploads, f), { recursive: true, force: true }); files++; }

  let disabled = 0;
  if (flag("--disable-demo-users")) {
    const demo = require("../src/lib/constants/demoUsers.js").DEMO_USERS.map((u) => String(u.email).toLowerCase());
    const [others] = await conn.query("SELECT COUNT(*) AS n FROM users WHERE status = 'active' AND LOWER(email) NOT IN (?)", [demo]);
    if (Number(others[0].n) < 1) console.error("Demo users were NOT disabled: there is no other active user yet. Create the real users first, then run this again with --disable-demo-users.");
    else { const [res] = await conn.query("UPDATE users SET status = 'disabled' WHERE LOWER(email) IN (?)", [demo]); disabled = res.affectedRows; }
  }
  await conn.end();

  const report = `Go-live cleanup of ${db} on ${new Date().toISOString()}\n${Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${t}: ${n}`).join("\n")}\nTotal rows removed: ${total}\nAttached files removed: ${files}\nDemo users disabled: ${disabled}\n`;
  fs.mkdirSync("backups", { recursive: true });
  fs.writeFileSync(path.join("backups", `go-live-cleanup-${stamp()}.txt`), report);
  console.log(`\nDone. ${total} rows and ${files} attached files removed${disabled ? `, ${disabled} demo users disabled` : ""}. Set APP_MODE=live to remove the demo banner and the demo logins.`);
}
main().catch((e) => { console.error("Cleanup failed:", e.message); process.exit(1); });
