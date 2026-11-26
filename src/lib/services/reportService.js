import "server-only";
import { QueryTypes } from "sequelize";
import db from "@/lib/db";
import { requirePermission, hasPermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";

/**
 * Reports for IKL (Sprint 4: MIR-3.5 registrations, MIR-5.8 by program / source / date, MIR-3.7 team
 * performance, MIR-3.8 export). Every report returns the same shape so the screen, the Excel file and the
 * PDF file are always built from the same numbers:
 *   { key, title, description, columns: [{ key, label, type }], rows: [...], totals: {...} | null, notes: [...] }
 * Column types: text, number, currency, percent (a number such as 83.3), date (YYYY-MM-DD).
 * A report only ever reads the departments the viewer may see, and a date range limits what happened in
 * the period (registrations made, leads created, deals won, payments received).
 */

export const REPORT_DEFS = [
  { key: "registrations", title: "Registrations by batch", description: "Per batch: registered, attended, no-show, completed, certificates, fees and feedback.", permission: "reports.view" },
  { key: "registration-list", title: "Registration list", description: "One line per registration with the person, company, attendance, payment and completion.", permission: "reports.view" },
  { key: "programs", title: "Report by program", description: "Per program: inquiries, interests, registrations, completion, fees collected and feedback.", permission: "reports.view" },
  { key: "sources", title: "Report by source", description: "Where leads come from and how far they get: leads, qualified, converted, deals and revenue.", permission: "reports.view" },
  { key: "monthly", title: "Report by date (monthly)", description: "Month by month: new contacts, deals, wins, registrations, completions and payments.", permission: "reports.view" },
  { key: "team", title: "Team performance", description: "Per team member: leads, follow-ups, meetings, calls, deals and revenue.", permission: "reports.view", managerOnly: true },
  { key: "revenue", title: "Revenue summary", description: "Won deals by training type, client and owner, with invoiced and received money.", permission: "reports.view" },
];

export function reportsFor(user) {
  return REPORT_DEFS.filter((d) => hasPermission(user, d.permission) && (!d.managerOnly || canSeeTeam(user)));
}

function canSeeTeam(user) {
  return hasPermission(user, "deals.approve") || hasPermission(user, "executive.dashboard.view");
}

const q = (sql, replacements) => db.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const num = (v) => Number(v || 0);
const pct = (a, b) => (b ? Math.round((num(a) / num(b)) * 1000) / 10 : 0);

async function scopeIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  const ids = await departmentIdsForKeys(keys);
  return ids.length ? ids : [0];
}

/** SQL fragment and replacements for "column falls in the range" (nothing when no range). */
function between(column, range, rep, tag) {
  const parts = [];
  if (range?.from) { parts.push(`${column} >= :${tag}From`); rep[`${tag}From`] = range.from; }
  if (range?.to) { parts.push(`${column} <= :${tag}To`); rep[`${tag}To`] = range.to; }
  return parts.length ? ` AND ${parts.join(" AND ")}` : "";
}

const col = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });

// ---------------------------------------------------------------- reports
async function registrationsReport(user, range) {
  const d = await scopeIds(user);
  const rep = { d };
  const rows = await q(
    `SELECT p.title AS program, b.code AS batch, b.start_date AS startDate, b.capacity AS capacity,
            COUNT(r.id) AS registered,
            SUM(r.attendance = 'Attended') AS attended, SUM(r.attendance = 'No Show') AS noShow,
            SUM(r.completion_status = 'Completed') AS completed, SUM(r.certificate_issued = 1) AS certificates,
            SUM(r.fee) AS fees, SUM(r.amount_paid) AS paid, ROUND(AVG(r.feedback_score), 2) AS feedback
       FROM registrations r
       JOIN program_batches b ON b.id = r.batch_id
       JOIN programs p ON p.id = r.program_id
      WHERE r.department_id IN (:d) AND r.status <> 'Cancelled'${between("r.created_at", range, rep, "r")}
      GROUP BY p.id, p.title, b.id, b.code, b.start_date, b.capacity
      ORDER BY b.start_date DESC, p.title`, rep);
  const out = rows.map((r) => ({
    program: r.program, batch: r.batch || "", startDate: r.startDate ? String(r.startDate).slice(0, 10) : "", capacity: num(r.capacity),
    registered: num(r.registered), attended: num(r.attended), noShow: num(r.noShow), completed: num(r.completed),
    certificates: num(r.certificates), attendanceRate: pct(r.attended, num(r.attended) + num(r.noShow)),
    fees: num(r.fees), paid: num(r.paid), feedback: r.feedback === null ? null : num(r.feedback),
  }));
  return {
    columns: [col("program", "Program"), col("batch", "Batch"), col("startDate", "Starts", "date"), col("capacity", "Seats", "number", { total: true }),
      col("registered", "Registered", "number", { total: true }), col("attended", "Attended", "number", { total: true }), col("noShow", "No-show", "number", { total: true }),
      col("attendanceRate", "Attendance of those marked", "percent"), col("completed", "Completed", "number", { total: true }), col("certificates", "Certificates", "number", { total: true }),
      col("fees", "Fees", "currency", { total: true }), col("paid", "Received", "currency", { total: true }), col("feedback", "Feedback (1-5)", "decimal")],
    rows: out,
    notes: ["Cancelled registrations are not counted.", "Attendance of those marked = attended / (attended + no-show)."],
  };
}

async function registrationListReport(user, range) {
  const d = await scopeIds(user);
  const rep = { d };
  const rows = await q(
    `SELECT r.created_at AS regDate, p.title AS program, b.code AS batch, TRIM(CONCAT(c.first_name, ' ', COALESCE(c.last_name, ''))) AS person,
            c.email AS email, co.name AS company, r.source AS source, r.status AS status, r.attendance AS attendance,
            r.fee AS fee, r.amount_paid AS paid, r.payment_status AS paymentStatus, r.completion_status AS completion,
            r.certificate_number AS certificate, r.feedback_score AS feedback
       FROM registrations r
       JOIN programs p ON p.id = r.program_id
       JOIN program_batches b ON b.id = r.batch_id
       JOIN contacts c ON c.id = r.contact_id
       LEFT JOIN companies co ON co.id = r.company_id
      WHERE r.department_id IN (:d)${between("r.created_at", range, rep, "r")}
      ORDER BY r.created_at DESC LIMIT 5000`, rep);
  return {
    columns: [col("regDate", "Registered on", "date"), col("program", "Program"), col("batch", "Batch"), col("person", "Participant"), col("email", "Email"), col("company", "Company"),
      col("source", "Source"), col("status", "Status"), col("attendance", "Attendance"), col("fee", "Fee", "currency", { total: true }), col("paid", "Paid", "currency", { total: true }),
      col("paymentStatus", "Payment"), col("completion", "Completion"), col("certificate", "Certificate no."), col("feedback", "Feedback", "number")],
    rows: rows.map((r) => ({ ...r, regDate: String(new Date(r.regDate).toISOString()).slice(0, 10), company: r.company || "", certificate: r.certificate || "", fee: num(r.fee), paid: num(r.paid), feedback: r.feedback === null ? null : num(r.feedback) })),
    notes: rows.length >= 5000 ? ["Showing the latest 5,000 registrations. Use a date range to see the rest."] : [],
  };
}

async function programsReport(user, range) {
  const d = await scopeIds(user);
  const rep = { d };
  const regRange = between("r.created_at", range, rep, "reg");
  const dealRange = between("dl.created_at", range, rep, "deal");
  const intRange = between("ci.created_at", range, rep, "int");
  const rows = await q(
    `SELECT p.title AS program, p.category AS category, p.program_type AS programType, p.status AS status,
            (SELECT COUNT(*) FROM program_batches b WHERE b.program_id = p.id) AS batches,
            (SELECT COUNT(*) FROM deals dl WHERE dl.program_id = p.id AND dl.deleted_at IS NULL${dealRange}) AS inquiries,
            (SELECT COUNT(*) FROM contact_interests ci WHERE ci.program_id = p.id${intRange}) AS interests,
            (SELECT COUNT(*) FROM registrations r WHERE r.program_id = p.id AND r.status <> 'Cancelled'${regRange}) AS registered,
            (SELECT COUNT(*) FROM registrations r WHERE r.program_id = p.id AND r.attendance = 'Attended'${regRange}) AS attended,
            (SELECT COUNT(*) FROM registrations r WHERE r.program_id = p.id AND r.completion_status = 'Completed'${regRange}) AS completed,
            (SELECT COALESCE(SUM(r.amount_paid), 0) FROM registrations r WHERE r.program_id = p.id${regRange}) AS collected,
            (SELECT ROUND(AVG(r.feedback_score), 2) FROM registrations r WHERE r.program_id = p.id AND r.feedback_score IS NOT NULL${regRange}) AS feedback
       FROM programs p WHERE p.department_id IN (:d)
      ORDER BY registered DESC, p.title`, rep);
  return {
    columns: [col("program", "Program"), col("category", "Category"), col("programType", "Type"), col("batches", "Batches", "number", { total: true }),
      col("inquiries", "Inquiries (deals)", "number", { total: true }), col("interests", "Interested people", "number", { total: true }), col("registered", "Registered", "number", { total: true }),
      col("attended", "Attended", "number", { total: true }), col("completed", "Completed", "number", { total: true }), col("completionRate", "Completion of attended", "percent"),
      col("collected", "Fees received", "currency", { total: true }), col("feedback", "Feedback (1-5)", "decimal")],
    rows: rows.map((r) => ({ program: r.program, category: r.category || "", programType: r.programType, batches: num(r.batches), inquiries: num(r.inquiries), interests: num(r.interests),
      registered: num(r.registered), attended: num(r.attended), completed: num(r.completed), completionRate: pct(r.completed, r.attended), collected: num(r.collected), feedback: r.feedback === null ? null : num(r.feedback) })),
    notes: ["Inquiries are deals linked to the program; interested people are contacts with the program in their interests.", range?.active ? "Counts of inquiries, interests and registrations follow the date range; batches are all batches." : ""].filter(Boolean),
  };
}

async function sourcesReport(user, range) {
  const d = await scopeIds(user);
  const rep = { d };
  const cRange = between("c.created_at", range, rep, "c");
  const dRange = between("dl.created_at", range, rep, "dc");
  const wRange = between("COALESCE(dl.closed_at, dl.updated_at)", range, rep, "dw");
  const rows = await q(
    `SELECT s.src AS source,
            (SELECT COUNT(*) FROM contacts c WHERE c.department_id IN (:d) AND c.deleted_at IS NULL AND COALESCE(c.source, 'Other') = s.src${cRange}) AS leads,
            (SELECT COUNT(*) FROM contacts c WHERE c.department_id IN (:d) AND c.deleted_at IS NULL AND COALESCE(c.source, 'Other') = s.src AND c.status IN ('Qualified','Converted')${cRange}) AS qualified,
            (SELECT COUNT(*) FROM contacts c WHERE c.department_id IN (:d) AND c.deleted_at IS NULL AND COALESCE(c.source, 'Other') = s.src AND c.status = 'Converted'${cRange}) AS converted,
            (SELECT COUNT(*) FROM deals dl WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND COALESCE(dl.source, 'Other') = s.src${dRange}) AS deals,
            (SELECT COUNT(*) FROM deals dl WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won' AND COALESCE(dl.source, 'Other') = s.src${wRange}) AS won,
            (SELECT COALESCE(SUM(dl.value), 0) FROM deals dl WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won' AND COALESCE(dl.source, 'Other') = s.src${wRange}) AS wonValue
       FROM (SELECT DISTINCT COALESCE(source, 'Other') AS src FROM contacts WHERE department_id IN (:d) AND deleted_at IS NULL
             UNION SELECT DISTINCT COALESCE(source, 'Other') FROM deals WHERE department_id IN (:d) AND deleted_at IS NULL) s
      ORDER BY leads DESC, s.src`, rep);
  const regRows = await q(
    `SELECT r.source AS source, COUNT(*) AS n FROM registrations r WHERE r.department_id IN (:d) AND r.status <> 'Cancelled'${between("r.created_at", range, rep, "rr")} GROUP BY r.source`, rep);
  const regBySource = Object.fromEntries(regRows.map((r) => [r.source, num(r.n)]));
  return {
    columns: [col("source", "Source"), col("leads", "Leads", "number", { total: true }), col("qualified", "Qualified or converted", "number", { total: true }), col("converted", "Converted", "number", { total: true }),
      col("conversion", "Converted of leads", "percent"), col("deals", "Deals", "number", { total: true }), col("won", "Deals won", "number", { total: true }), col("wonValue", "Won value", "currency", { total: true }),
      col("registrations", "Registrations", "number", { total: true })],
    rows: rows.map((r) => ({ source: r.source, leads: num(r.leads), qualified: num(r.qualified), converted: num(r.converted), conversion: pct(r.converted, r.leads), deals: num(r.deals), won: num(r.won), wonValue: num(r.wonValue), registrations: regBySource[r.source] || 0 }))
      .filter((r) => r.leads || r.deals || r.registrations),
    notes: ["Leads are contacts created in the period, grouped by their source. Deals use the source set on the deal. Registrations are grouped by how they were made (Manual, Website, Nomination)."],
  };
}

function monthsBetween(range) {
  const end = range?.to ? new Date(range.to) : new Date();
  const start = range?.from ? new Date(range.from) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  const out = [];
  let y = start.getUTCFullYear(), m = start.getUTCMonth();
  while ((y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth())) && out.length < 60) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

async function monthlyReport(user, range) {
  const d = await scopeIds(user);
  const months = monthsBetween(range);
  const eff = { active: true, from: new Date(`${months[0]}-01T00:00:00.000Z`), to: range?.to || new Date() };
  const rep = { d };
  const grp = async (table, dateCol, extraWhere, valueExpr, tag) => {
    const r2 = { d, ...rep };
    const sql = `SELECT DATE_FORMAT(${dateCol}, '%Y-%m') AS m, COUNT(*) AS n${valueExpr ? `, COALESCE(SUM(${valueExpr}), 0) AS v` : ""} FROM ${table} WHERE ${extraWhere}${between(dateCol, eff, r2, tag)} GROUP BY m`;
    return Object.fromEntries((await q(sql, r2)).map((r) => [r.m, { n: num(r.n), v: num(r.v) }]));
  };
  const [contacts, deals, won, regs, completed, paid] = await Promise.all([
    grp("contacts c", "c.created_at", "c.department_id IN (:d) AND c.deleted_at IS NULL", null, "mc"),
    grp("deals dl", "dl.created_at", "dl.department_id IN (:d) AND dl.deleted_at IS NULL", null, "md"),
    grp("deals dl", "COALESCE(dl.closed_at, dl.updated_at)", "dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'", "dl.value", "mw"),
    grp("registrations r", "r.created_at", "r.department_id IN (:d) AND r.status <> 'Cancelled'", null, "mr"),
    grp("registrations r", "r.completed_at", "r.department_id IN (:d) AND r.completion_status = 'Completed' AND r.completed_at IS NOT NULL", null, "mk"),
    grp("payments p JOIN invoices i ON i.id = p.invoice_id JOIN deals dl ON dl.id = i.deal_id", "p.paid_at", "dl.department_id IN (:d)", "p.amount", "mp"),
  ]);
  return {
    columns: [col("month", "Month"), col("contacts", "New contacts", "number", { total: true }), col("deals", "New deals", "number", { total: true }), col("won", "Deals won", "number", { total: true }),
      col("wonValue", "Won value", "currency", { total: true }), col("registrations", "Registrations", "number", { total: true }), col("completed", "Completions", "number", { total: true }), col("received", "Payments received", "currency", { total: true })],
    rows: months.map((m) => ({ month: m, contacts: contacts[m]?.n || 0, deals: deals[m]?.n || 0, won: won[m]?.n || 0, wonValue: won[m]?.v || 0, registrations: regs[m]?.n || 0, completed: completed[m]?.n || 0, received: paid[m]?.v || 0 })),
    notes: [range?.active ? "" : "No date range chosen: the last 12 months are shown."].filter(Boolean),
  };
}

async function teamReport(user, range) {
  if (!canSeeTeam(user)) { const e = new Error("The team report is for the Head of Department."); e.status = 403; throw e; }
  const d = await scopeIds(user);
  const rep = { d };
  const lead = between("c.created_at", range, rep, "tl");
  const taskDone = between("t.completed_at", range, rep, "tt");
  const meet = between("m.start_at", range, rep, "tm");
  const call = between("a.occurred_at", range, rep, "ta");
  const dealNew = between("dl.created_at", range, rep, "td");
  const won = between("COALESCE(dl.closed_at, dl.updated_at)", range, rep, "tw");
  const rows = await q(
    `SELECT u.name AS person, u.primary_role_key AS role,
            (SELECT COUNT(*) FROM contacts c WHERE c.owner_id = u.id AND c.department_id IN (:d) AND c.deleted_at IS NULL${lead}) AS leads,
            (SELECT COUNT(*) FROM contacts c WHERE c.owner_id = u.id AND c.department_id IN (:d) AND c.deleted_at IS NULL AND c.status = 'Converted'${lead}) AS converted,
            (SELECT COUNT(*) FROM tasks t WHERE t.owner_id = u.id AND t.department_id IN (:d) AND t.status = 'Completed'${taskDone}) AS tasksDone,
            (SELECT COUNT(*) FROM tasks t WHERE t.owner_id = u.id AND t.department_id IN (:d) AND t.status IN ('Pending','In Progress')) AS tasksOpen,
            (SELECT COUNT(*) FROM tasks t WHERE t.owner_id = u.id AND t.department_id IN (:d) AND t.status = 'Overdue') AS tasksOverdue,
            (SELECT COUNT(*) FROM meetings m WHERE m.owner_id = u.id AND m.department_id IN (:d) AND m.status = 'Completed'${meet}) AS meetings,
            (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id AND a.type = 'call'${call}) AS calls,
            (SELECT COUNT(*) FROM deals dl WHERE dl.owner_id = u.id AND dl.department_id IN (:d) AND dl.deleted_at IS NULL${dealNew}) AS deals,
            (SELECT COUNT(*) FROM deals dl WHERE dl.owner_id = u.id AND dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'${won}) AS dealsWon,
            (SELECT COALESCE(SUM(dl.value), 0) FROM deals dl WHERE dl.owner_id = u.id AND dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'${won}) AS revenue
       FROM users u WHERE u.department_id IN (:d) AND u.status = 'active'
      ORDER BY revenue DESC, leads DESC, u.name`, rep);
  return {
    columns: [col("person", "Team member"), col("role", "Role"), col("leads", "Leads owned", "number", { total: true }), col("converted", "Converted", "number", { total: true }),
      col("tasksDone", "Follow-ups done", "number", { total: true }), col("tasksOpen", "Follow-ups open", "number", { total: true }), col("tasksOverdue", "Overdue now", "number", { total: true }),
      col("meetings", "Meetings held", "number", { total: true }), col("calls", "Calls logged", "number", { total: true }), col("deals", "Deals", "number", { total: true }),
      col("dealsWon", "Deals won", "number", { total: true }), col("revenue", "Won value", "currency", { total: true })],
    rows: rows.map((r) => ({ person: r.person, role: String(r.role || "").replace(/^DEPARTMENT_/, "").replace(/_/g, " ").toLowerCase(), leads: num(r.leads), converted: num(r.converted), tasksDone: num(r.tasksDone), tasksOpen: num(r.tasksOpen),
      tasksOverdue: num(r.tasksOverdue), meetings: num(r.meetings), calls: num(r.calls), deals: num(r.deals), dealsWon: num(r.dealsWon), revenue: num(r.revenue) })),
    notes: ["Leads owned are contacts created in the period that belong to the person. Follow-ups open and overdue are today's figures."],
  };
}

async function revenueReport(user, range) {
  const d = await scopeIds(user);
  const rep = { d };
  const won = between("COALESCE(dl.closed_at, dl.updated_at)", range, rep, "w");
  const base = `FROM deals dl WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'${won}`;
  const [byType, byCompany, byOwner, money] = await Promise.all([
    q(`SELECT COALESCE(dl.training_type, 'Not set') AS name, COUNT(*) AS deals, COALESCE(SUM(dl.value), 0) AS value ${base} GROUP BY COALESCE(dl.training_type, 'Not set') ORDER BY value DESC`, rep),
    q(`SELECT COALESCE(co.name, 'No company') AS name, COUNT(*) AS deals, COALESCE(SUM(dl.value), 0) AS value FROM deals dl LEFT JOIN companies co ON co.id = dl.company_id WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'${won} GROUP BY co.id, co.name ORDER BY value DESC LIMIT 25`, rep),
    q(`SELECT COALESCE(u.name, 'Unassigned') AS name, COUNT(*) AS deals, COALESCE(SUM(dl.value), 0) AS value FROM deals dl LEFT JOIN users u ON u.id = dl.owner_id WHERE dl.department_id IN (:d) AND dl.deleted_at IS NULL AND dl.status = 'won'${won} GROUP BY u.id, u.name ORDER BY value DESC`, rep),
    q(`SELECT (SELECT COALESCE(SUM(i.amount), 0) FROM invoices i JOIN deals dl ON dl.id = i.deal_id WHERE dl.department_id IN (:d)${between("i.issue_date", range, rep, "mi")}) AS invoiced,
              (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN deals dl ON dl.id = i.deal_id WHERE dl.department_id IN (:d)${between("p.paid_at", range, rep, "mp")}) AS received`, rep),
  ]);
  const rows = [
    ...byType.map((r) => ({ group: "Training type", name: r.name, deals: num(r.deals), value: num(r.value) })),
    ...byCompany.map((r) => ({ group: "Client (top 25)", name: r.name, deals: num(r.deals), value: num(r.value) })),
    ...byOwner.map((r) => ({ group: "Owner", name: r.name, deals: num(r.deals), value: num(r.value) })),
  ];
  const m = money[0] || {};
  return {
    columns: [col("group", "Grouped by"), col("name", "Name"), col("deals", "Deals won", "number"), col("value", "Won value", "currency")],
    rows,
    summary: [{ label: "Invoiced in the period", value: num(m.invoiced), type: "currency" }, { label: "Money received in the period", value: num(m.received), type: "currency" }],
    notes: ["Won value is shown three times, once for each grouping; do not add the groups together.", "Invoiced and received are the references entered by the sales team; invoices themselves are issued in IKL's finance system."],
  };
}

const RUNNERS = {
  registrations: registrationsReport, "registration-list": registrationListReport, programs: programsReport,
  sources: sourcesReport, monthly: monthlyReport, team: teamReport, revenue: revenueReport,
};

function withTotals(columns, rows) {
  const sums = columns.filter((c) => c.total);
  if (!sums.length || !rows.length) return null;
  const t = {};
  for (const c of sums) t[c.key] = rows.reduce((a, r) => a + num(r[c.key]), 0);
  return t;
}

/** Runs one report for the viewer and range. Throws a 404-style error for an unknown report. */
export async function runReport(user, key, range = null) {
  const def = REPORT_DEFS.find((d) => d.key === key);
  if (!def) { const e = new Error("Report not found."); e.status = 404; throw e; }
  requirePermission(user, def.permission);
  const result = await RUNNERS[key](user, range);
  return {
    key, title: def.title, description: def.description,
    columns: result.columns, rows: result.rows, totals: withTotals(result.columns, result.rows),
    summary: result.summary || [], notes: result.notes || [],
    period: range?.label || "All time", department: user.department?.name || "",
  };
}

/** Exporting needs its own permission (Head and Marketing have it, Sales does not). */
export function canExportReports(user) {
  return hasPermission(user, "reports.export");
}
