"use strict";
/**
 * Response-time check (GO-3):  npm run perf:check -- --url http://localhost:3000 --cookie "<crm_session value>"
 *   or, on a machine that has the server's SESSION_SECRET:  --as-user <user id>
 *   optional: --runs 7   --write docs/performance-check.md
 * Opens the screens people use all day (lists, search, filters, dashboards, reports, documents) several times each and
 * reports the median and slowest time. Targets: screens under 2 seconds, search under 1 second. Run it against a
 * production build (npm run build && npm start) or the live address with IKL-sized data, not the development server.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = String(arg("--url", "http://localhost:3000")).replace(/\/$/, "");
const RUNS = Number(arg("--runs", 7));

const SCREENS = [
  ["Dashboard (IKL)", "/ikl", 2000], ["Dashboard with a date range", "/ikl?range=90d", 2000],
  ["Contacts list", "/contacts", 2000], ["Contacts: search by name", "/contacts?q=ali", 1000], ["Contacts: filter by status", "/contacts?status=Qualified", 2000],
  ["Contacts: filter by source and date", "/contacts?source=Website&from=2026-01-01", 2000],
  ["Companies list", "/companies", 2000], ["Deals board", "/deals", 2000], ["Deals: filtered", "/deals?status=open", 2000],
  ["Programs", "/programs", 2000], ["Registrations", "/registrations", 2000], ["Tasks", "/tasks", 2000],
  ["Global search", "/api/search?q=ali", 1000], ["Documents: search by words", "/documents?q=training", 1000],
  ["Report: registrations", "/reports/view/registrations", 2000], ["Report: by program", "/reports/view/programs", 2000], ["Report: by source", "/reports/view/sources", 2000],
  ["Report: by month", "/reports/view/monthly", 2000], ["Report: team performance", "/reports/view/team", 2000], ["Report: revenue", "/reports/view/revenue", 2000],
];

async function cookieHeader() {
  const given = arg("--cookie", null);
  if (given) return given.includes("=") ? given : `crm_session=${given}`;
  const uid = arg("--as-user", null);
  if (!uid) { console.error("Give --cookie <crm_session value> or --as-user <user id>."); process.exit(1); }
  const { SignJWT } = require("jose");
  const token = await new SignJWT({ uid: Number(uid) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  return `crm_session=${token}`;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function main() {
  const cookie = await cookieHeader();
  const rows = [];
  for (const [name, url, limit] of SCREENS) {
    const times = []; let status = 0, bytes = 0;
    for (let i = 0; i < RUNS + 1; i++) {
      const t0 = performance.now();
      const res = await fetch(BASE + url, { headers: { cookie }, redirect: "manual" });
      const body = await res.arrayBuffer();
      const ms = performance.now() - t0;
      status = res.status; bytes = body.byteLength;
      if (i > 0) times.push(ms); // the first request warms the server up
    }
    rows.push({ name, url, limit, status, kb: Math.round(bytes / 1024), median: Math.round(median(times)), worst: Math.round(Math.max(...times)) });
  }
  const ok = (r) => r.status === 200 && r.median <= r.limit;
  const width = Math.max(...rows.map((r) => r.name.length));
  console.log(`\nResponse times against ${BASE} (${RUNS} runs each, after one warm-up)\n`);
  for (const r of rows) console.log(`${ok(r) ? "PASS" : "SLOW"}  ${r.name.padEnd(width)}  median ${String(r.median).padStart(5)} ms   slowest ${String(r.worst).padStart(5)} ms   ${String(r.kb).padStart(5)} KB   HTTP ${r.status}   (target ${r.limit} ms)`);
  const failed = rows.filter((r) => !ok(r));
  console.log(`\n${rows.length - failed.length} of ${rows.length} within target.`);

  const out = arg("--write", null);
  if (out) {
    const md = [`# Response-time check`, ``, `Run on ${new Date().toISOString().slice(0, 10)} against ${BASE} (${RUNS} runs per screen after one warm-up; production build).`, ``,
      `| Screen | Median (ms) | Slowest (ms) | Target (ms) | Result |`, `|---|---:|---:|---:|---|`,
      ...rows.map((r) => `| ${r.name} | ${r.median} | ${r.worst} | ${r.limit} | ${ok(r) ? "pass" : "slow"} |`), ``, `${rows.length - failed.length} of ${rows.length} screens within target.`, ``].join("\n");
    fs.writeFileSync(out, md);
    console.log(`Written to ${out}`);
  }
  process.exit(failed.length ? 2 : 0);
}
main().catch((e) => { console.error("Check failed:", e.message); process.exit(1); });
