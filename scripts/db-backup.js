"use strict";
/**
 * Backup of the CRM database (GO-2):  npm run db:backup  [-- --out backups] [--with-uploads]
 * Writes backups/crm-<date>.sql.gz: every table (structure and rows) as plain SQL, one statement per line.
 * With --with-uploads the attached documents are copied next to it. Restore with: npm run db:restore -- <file>
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { connect, stamp } = require("./lib-db");

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] || true : fallback; };

async function main() {
  const outDir = path.resolve(String(arg("--out", "backups")));
  fs.mkdirSync(outDir, { recursive: true });
  const name = `crm-${stamp()}`;
  const file = path.join(outDir, `${name}.sql.gz`);
  const conn = await connect();
  const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
  const gz = zlib.createGzip({ level: 9 });
  const sink = fs.createWriteStream(file);
  gz.pipe(sink);
  const write = (s) => new Promise((resolve) => { if (gz.write(s)) resolve(); else gz.once("drain", resolve); });

  await write(`-- IKL CRM backup of \`${db}\` taken ${new Date().toISOString()}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n`);
  const [tables] = await conn.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
  const counts = {};
  for (const { t } of tables) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
    await write(`DROP TABLE IF EXISTS \`${t}\`;\n${create["Create Table"].replace(/\s*\n\s*/g, " ")};\n`);
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    counts[t] = Number(n);
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
    const names = cols.map((c) => `\`${c.Field}\``).join(", ");
    const batch = 500;
    for (let offset = 0; offset < n; offset += batch) {
      const [rows] = await conn.query(`SELECT * FROM \`${t}\` LIMIT ${batch} OFFSET ${offset}`);
      if (!rows.length) break;
      const values = rows.map((r) => `(${cols.map((c) => conn.escape(r[c.Field])).join(",")})`).join(",");
      await write(`INSERT INTO \`${t}\` (${names}) VALUES ${values};\n`);
    }
  }
  await write("SET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n");
  gz.end();
  await new Promise((resolve) => sink.on("close", resolve));
  fs.writeFileSync(path.join(outDir, `${name}.counts.json`), JSON.stringify({ database: db, takenAt: new Date().toISOString(), tables: counts }, null, 2));

  if (arg("--with-uploads", false)) {
    const uploads = process.env.UPLOAD_DIR || path.resolve("uploads");
    if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(outDir, `${name}-uploads`), { recursive: true });
  }
  await conn.end();
  const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`Backup written: ${file} (${size} MB, ${tables.length} tables, ${Object.values(counts).reduce((a, b) => a + b, 0)} rows)`);
}
main().catch((e) => { console.error("Backup failed:", e.message); process.exit(1); });
