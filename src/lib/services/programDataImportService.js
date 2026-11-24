import "server-only";
import * as XLSX from "xlsx";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { normalizeCompanyName } from "./companyService";
import { recordAudit } from "./auditService";
import { PROGRAM_TYPES, PROGRAM_STATUSES, BATCH_STATUSES, REGISTRATION_STATUSES, ATTENDANCE_STATUSES, PAYMENT_STATUSES, COMPLETION_STATUSES } from "@/lib/constants/programs";

const { Program, ProgramBatch, Contact, Company, Registration, Note, Activity, Import } = db;

/**
 * One-time migration of IKL's existing Excel data (CRM-4.8, CRM-4.9): programs, batches, participants,
 * registrations (attendance, payment, completion, certificate, feedback) and past history, from one workbook
 * with up to five sheets. The same code runs as a check ("dry run": everything is tried inside a transaction that
 * is rolled back) and as the real import, so what the check reports is exactly what the import does.
 * Safe to run again: people are matched by email, programs by code (or title), batches by program and code,
 * registrations by batch and person, history by person, date and title.
 */

export const TEMPLATE = {
  Programs: { columns: ["code", "title", "category", "type", "duration_days", "duration_text", "default_fee", "description", "status"], example: ["LDR-101", "Leadership Essentials", "Leadership & Management", "Open enrollment", 3, "3 days", 45000, "Core leadership skills", "Active"] },
  Batches: { columns: ["program_code", "batch_code", "start_date", "end_date", "venue", "capacity", "fee", "status"], example: ["LDR-101", "LDR-101-2026-03", "2026-03-10", "2026-03-12", "Lahore", 25, 45000, "Completed"] },
  Participants: { columns: ["email", "first_name", "last_name", "phone", "company", "job_title", "city", "source"], example: ["ayesha.khan@example.com", "Ayesha", "Khan", "0300-1234567", "Example Industries", "HR Manager", "Lahore", "Referral"] },
  Registrations: { columns: ["email", "program_code", "batch_code", "registration_status", "attendance", "fee", "payment_status", "amount_paid", "invoice_number", "completion_status", "completed_on", "certificate_number", "certificate_date", "feedback_score", "feedback_comments"], example: ["ayesha.khan@example.com", "LDR-101", "LDR-101-2026-03", "Registered", "Attended", 45000, "Paid", 45000, "INV-2026-0042", "Completed", "2026-03-12", "CERT-0042", "2026-03-15", 5, "Very useful"] },
  History: { columns: ["email", "date", "kind", "title", "text"], example: ["ayesha.khan@example.com", "2026-02-20", "call", "Enquiry call", "Asked about the March batch"] },
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES = {
  programcode: ["programcode", "program", "programid", "programtitle", "course", "coursecode"],
  batchcode: ["batchcode", "batch", "batchid", "session"],
  firstname: ["firstname", "first", "givenname"], lastname: ["lastname", "last", "surname", "familyname"],
  jobtitle: ["jobtitle", "designation", "title2"], startdate: ["startdate", "start", "from", "begins"], enddate: ["enddate", "end", "to", "finishes"],
  registrationstatus: ["registrationstatus", "regstatus"], completedon: ["completedon", "completiondate", "completedat"], certificatenumber: ["certificatenumber", "certificateno", "certno", "certificate"],
  certificatedate: ["certificatedate", "certdate", "issuedon"], feedbackscore: ["feedbackscore", "score", "rating"], feedbackcomments: ["feedbackcomments", "comments", "feedback"],
  durationdays: ["durationdays", "days"], durationtext: ["durationtext", "duration"], defaultfee: ["defaultfee", "fee", "price"], paymentstatus: ["paymentstatus", "payment"],
  amountpaid: ["amountpaid", "paid", "received"], invoicenumber: ["invoicenumber", "invoiceno", "invoice"], completionstatus: ["completionstatus", "completion"],
};

function keyRow(raw, columns) {
  const byNorm = {};
  for (const [k, v] of Object.entries(raw)) byNorm[norm(k)] = v;
  const out = {};
  for (const col of columns) {
    const n = norm(col);
    let v = byNorm[n];
    if (v === undefined) for (const alias of ALIASES[n] || []) if (byNorm[alias] !== undefined) { v = byNorm[alias]; break; }
    out[col] = v === undefined || v === null ? "" : v;
  }
  return out;
}
const txt = (v) => String(v ?? "").trim();
const numOrNull = (v) => { const s = txt(v).replace(/[, ]/g, ""); if (s === "") return null; const n = Number(s); return Number.isFinite(n) ? n : NaN; };
function dateOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return v > 20000 ? new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10) : NaN;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const t = Date.parse(`${s} UTC`);
  return Number.isNaN(t) ? NaN : new Date(t).toISOString().slice(0, 10);
}
const pick = (v, list, fallback) => { const s = txt(v); if (!s) return fallback; const hit = list.find((x) => x.toLowerCase() === s.toLowerCase()); return hit === undefined ? null : hit; };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readSheets(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const out = {};
  for (const name of Object.keys(TEMPLATE)) {
    const sheetName = wb.SheetNames.find((n) => norm(n) === norm(name));
    out[name] = sheetName ? XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "", raw: true }).map((r) => keyRow(r, TEMPLATE[name].columns)) : null;
  }
  return out;
}

function sameValue(a, b) {
  if (a == null || b == null) return (a ?? null) === (b ?? null);
  if (typeof a === "number" || typeof b === "number" || typeof a === "boolean" || typeof b === "boolean") return Number(a) === Number(b);
  return String(a) === String(b);
}
/** Saves only the fields that really differ; returns true when something changed. */
async function applyChanges(model, values, transaction) {
  const changed = Object.keys(values).filter((k) => !sameValue(model.get(k), values[k]));
  if (!changed.length) return false;
  await model.update(Object.fromEntries(changed.map((k) => [k, values[k]])), { transaction });
  return true;
}

function newReport(name, read) { return { sheet: name, read, created: 0, updated: 0, unchanged: 0, errors: [] }; }
function fail(rep, rowIndex, message) { rep.errors.push({ row: rowIndex + 2, message }); }

/** Runs the migration. options.dryRun: try everything, write nothing. */
export async function importProgramData(user, { buffer, filename = "program-data.xlsx", departmentKey, dryRun = true }) {
  requirePermission(user, "training.manage");
  requirePermission(user, "contacts.import");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");
  const sheets = readSheets(buffer);
  if (!Object.values(sheets).some(Boolean)) throw new Error(`No sheet found. The workbook needs at least one of: ${Object.keys(TEMPLATE).join(", ")}. Download the template for the exact layout.`);

  const reports = [];
  const t = await db.sequelize.transaction();
  const programCache = new Map(); // key (code or title, lower) -> Program
  const batchCache = new Map(); // `${programId}|${batchCode}` -> ProgramBatch
  const contactCache = new Map(); // email -> Contact
  const touchedContacts = new Set();

  async function findProgram(ref) {
    const key = txt(ref).toLowerCase();
    if (!key) return null;
    if (programCache.has(key)) return programCache.get(key);
    let p = await Program.findOne({ where: { departmentId: dept.id, code: txt(ref) }, transaction: t });
    if (!p) p = await Program.findOne({ where: { departmentId: dept.id, title: txt(ref) }, transaction: t });
    programCache.set(key, p);
    return p;
  }
  async function findContact(email) {
    const key = txt(email).toLowerCase();
    if (contactCache.has(key)) return contactCache.get(key);
    const c = await Contact.findOne({ where: { departmentId: dept.id, email: key }, transaction: t });
    contactCache.set(key, c);
    return c;
  }
  const companyIds = new Map();
  async function companyId(name) {
    const n = txt(name); if (!n) return null;
    const key = normalizeCompanyName(n);
    if (companyIds.has(key)) return companyIds.get(key);
    const all = companyIds.size === 0 ? await Company.findAll({ where: { departmentId: dept.id }, attributes: ["id", "name"], transaction: t }) : [];
    for (const c of all) companyIds.set(normalizeCompanyName(c.name), c.id);
    if (!companyIds.has(key)) {
      const c = await Company.create({ name: n, organizationType: "Corporate", status: "Active", country: "Pakistan", leadSource: "Other", departmentId: dept.id, ownerId: user.id }, { transaction: t });
      companyIds.set(key, c.id);
    }
    return companyIds.get(key);
  }

  try {
    // ---------------- Programs
    if (sheets.Programs) {
      const rep = newReport("Programs", sheets.Programs.length);
      for (const [i, r] of sheets.Programs.entries()) {
        const title = txt(r.title);
        if (!title) { fail(rep, i, "Title is missing."); continue; }
        const type = pick(r.type, PROGRAM_TYPES, "Open enrollment");
        const status = pick(r.status, PROGRAM_STATUSES, "Active");
        const days = numOrNull(r.duration_days), fee = numOrNull(r.default_fee);
        if (type === null) { fail(rep, i, `Type "${r.type}" is not one of: ${PROGRAM_TYPES.join(", ")}.`); continue; }
        if (status === null) { fail(rep, i, `Status "${r.status}" is not one of: ${PROGRAM_STATUSES.join(", ")}.`); continue; }
        if (Number.isNaN(days) || Number.isNaN(fee)) { fail(rep, i, "Duration days and fee must be numbers."); continue; }
        const values = { code: txt(r.code) || null, title, category: txt(r.category) || null, programType: type, durationDays: days === null ? null : Math.round(days), durationText: txt(r.duration_text) || null, defaultFee: fee ?? 0, description: txt(r.description) || null, status };
        let p = (values.code && await Program.findOne({ where: { departmentId: dept.id, code: values.code }, transaction: t })) || await Program.findOne({ where: { departmentId: dept.id, title }, transaction: t });
        if (p) { if (await applyChanges(p, values, t)) rep.updated++; else rep.unchanged++; }
        else { p = await Program.create({ ...values, departmentId: dept.id, createdBy: user.id }, { transaction: t }); rep.created++; }
        programCache.set((values.code || title).toLowerCase(), p); programCache.set(title.toLowerCase(), p);
      }
      reports.push(rep);
    }

    // ---------------- Batches
    if (sheets.Batches) {
      const rep = newReport("Batches", sheets.Batches.length);
      for (const [i, r] of sheets.Batches.entries()) {
        const program = await findProgram(r.program_code);
        if (!program) { fail(rep, i, `Program "${r.program_code}" was not found (add it to the Programs sheet first).`); continue; }
        const start = dateOrNull(r.start_date), end = dateOrNull(r.end_date), cap = numOrNull(r.capacity), fee = numOrNull(r.fee);
        if (Number.isNaN(start) || Number.isNaN(end)) { fail(rep, i, "A date could not be read. Use YYYY-MM-DD."); continue; }
        if (Number.isNaN(cap) || Number.isNaN(fee)) { fail(rep, i, "Capacity and fee must be numbers."); continue; }
        const code = txt(r.batch_code) || null;
        if (!code && !start) { fail(rep, i, "Give a batch code or a start date."); continue; }
        const defaultStatus = (end || start) && (end || start) < new Date().toISOString().slice(0, 10) ? "Completed" : "Planned";
        const status = pick(r.status, BATCH_STATUSES, defaultStatus);
        if (status === null) { fail(rep, i, `Status "${r.status}" is not one of: ${BATCH_STATUSES.join(", ")}.`); continue; }
        const values = { programId: program.id, code, startDate: start, endDate: end, venue: txt(r.venue) || null, capacity: cap === null ? null : Math.round(cap), fee, status };
        let b = await ProgramBatch.findOne({ where: code ? { programId: program.id, code } : { programId: program.id, startDate: start }, transaction: t });
        if (b) { if (await applyChanges(b, values, t)) rep.updated++; else rep.unchanged++; }
        else { b = await ProgramBatch.create({ ...values, createdBy: user.id }, { transaction: t }); rep.created++; }
        batchCache.set(`${program.id}|${code || start}`, b);
      }
      reports.push(rep);
    }

    // ---------------- Participants (people)
    if (sheets.Participants) {
      const rep = newReport("Participants", sheets.Participants.length);
      for (const [i, r] of sheets.Participants.entries()) {
        const email = txt(r.email).toLowerCase();
        if (!EMAIL_RE.test(email)) { fail(rep, i, email ? `"${r.email}" is not a valid email address.` : "Email is missing."); continue; }
        const first = txt(r.first_name);
        const cid = await companyId(r.company);
        let c = await findContact(email);
        if (c) {
          const patch = {};
          if (!c.phone && txt(r.phone)) patch.phone = txt(r.phone);
          if (!c.jobTitle && txt(r.job_title)) patch.jobTitle = txt(r.job_title);
          if (!c.city && txt(r.city)) patch.city = txt(r.city);
          if (!c.companyId && cid) patch.companyId = cid;
          if (!c.isParticipant) patch.isParticipant = true;
          if (Object.keys(patch).length) { await c.update(patch, { transaction: t }); rep.updated++; } else rep.unchanged++;
        } else {
          if (!first) { fail(rep, i, "First name is missing for a new person."); continue; }
          c = await Contact.create({ firstName: first, lastName: txt(r.last_name), email, phone: txt(r.phone) || null, jobTitle: txt(r.job_title) || null, city: txt(r.city) || null, country: "Pakistan", companyId: cid, source: txt(r.source) || "Other", departmentId: dept.id, ownerId: user.id, contactType: "Customer", status: "New", engagementStatus: "Inactive", leadScore: 0, isParticipant: true }, { transaction: t });
          contactCache.set(email, c); rep.created++;
        }
        touchedContacts.add(c.id);
      }
      reports.push(rep);
    }

    // ---------------- Registrations
    if (sheets.Registrations) {
      const rep = newReport("Registrations", sheets.Registrations.length);
      for (const [i, r] of sheets.Registrations.entries()) {
        const email = txt(r.email).toLowerCase();
        const contact = EMAIL_RE.test(email) ? await findContact(email) : null;
        if (!contact) { fail(rep, i, email ? `Person ${email} was not found (add them to the Participants sheet).` : "Email is missing."); continue; }
        const program = await findProgram(r.program_code);
        if (!program) { fail(rep, i, `Program "${r.program_code}" was not found.`); continue; }
        const bcode = txt(r.batch_code);
        let batch = batchCache.get(`${program.id}|${bcode}`);
        if (!batch) {
          const where = bcode ? { programId: program.id, code: bcode } : { programId: program.id };
          const found = await ProgramBatch.findAll({ where, limit: 2, transaction: t });
          if (found.length === 1) batch = found[0]; else if (found.length > 1) { fail(rep, i, "More than one batch matches: give the batch code."); continue; }
          if (batch) batchCache.set(`${program.id}|${bcode}`, batch);
        }
        if (!batch) { fail(rep, i, `Batch "${bcode}" of ${program.title} was not found.`); continue; }
        const status = pick(r.registration_status, REGISTRATION_STATUSES, "Registered");
        const completion = pick(r.completion_status, COMPLETION_STATUSES, "In progress");
        let attendance = pick(r.attendance, ATTENDANCE_STATUSES, completion === "Completed" ? "Attended" : "Registered");
        const fee = numOrNull(r.fee), paid = numOrNull(r.amount_paid), score = numOrNull(r.feedback_score);
        const completedOn = dateOrNull(r.completed_on), certDate = dateOrNull(r.certificate_date);
        if (status === null || completion === null || attendance === null) { fail(rep, i, "Registration status, attendance or completion is not one of the allowed words."); continue; }
        if ([fee, paid, score].some(Number.isNaN) || Number.isNaN(completedOn) || Number.isNaN(certDate)) { fail(rep, i, "A number or date could not be read."); continue; }
        if (score !== null && (score < 1 || score > 5)) { fail(rep, i, "Feedback score must be from 1 to 5."); continue; }
        if (completion === "Completed" && attendance !== "Attended") attendance = "Attended";
        const amount = fee ?? (batch.fee != null ? Number(batch.fee) : Number(program.defaultFee || 0));
        const pay = pick(r.payment_status, PAYMENT_STATUSES, paid && paid >= amount && amount > 0 ? "Paid" : paid ? "Partially paid" : amount > 0 ? "Unpaid" : "Paid");
        if (pay === null) { fail(rep, i, `Payment status "${r.payment_status}" is not one of: ${PAYMENT_STATUSES.join(", ")}.`); continue; }
        const certNo = txt(r.certificate_number) || null;
        const values = {
          departmentId: program.departmentId, programId: program.id, batchId: batch.id, contactId: contact.id, companyId: contact.companyId || null, source: "Import", status, attendance, fee: amount,
          paymentStatus: pay, amountPaid: paid ?? 0, invoiceNumber: txt(r.invoice_number) || null, completionStatus: completion, completedAt: completion === "Completed" ? completedOn || batch.endDate || null : null,
          certificateIssued: Boolean(certNo), certificateNumber: certNo, certificateDate: certDate, feedbackScore: score === null ? null : Math.round(score), feedbackComments: txt(r.feedback_comments) || null, feedbackAt: score === null ? null : new Date(), createdBy: user.id,
        };
        const existing = await Registration.findOne({ where: { batchId: batch.id, contactId: contact.id }, transaction: t });
        if (existing) { const { createdBy: _ignored, feedbackAt: _fa, ...compare } = values; if (await applyChanges(existing, compare, t)) rep.updated++; else rep.unchanged++; }
        else { await Registration.create(values, { transaction: t }); rep.created++; }
        touchedContacts.add(contact.id);
      }
      reports.push(rep);
    }

    // ---------------- History
    if (sheets.History) {
      const rep = newReport("History", sheets.History.length);
      const KINDS = { note: "note", call: "call", meeting: "meeting", email: "email", whatsapp: "whatsapp" };
      for (const [i, r] of sheets.History.entries()) {
        const email = txt(r.email).toLowerCase();
        const contact = EMAIL_RE.test(email) ? await findContact(email) : null;
        if (!contact) { fail(rep, i, email ? `Person ${email} was not found.` : "Email is missing."); continue; }
        const when = dateOrNull(r.date);
        if (!when || Number.isNaN(when)) { fail(rep, i, "Date is missing or could not be read. Use YYYY-MM-DD."); continue; }
        const kind = KINDS[txt(r.kind).toLowerCase()] || "note";
        const title = (txt(r.title) || txt(r.text) || "Past interaction").slice(0, 250);
        const occurredAt = new Date(`${when}T09:00:00.000Z`);
        const dup = await Activity.findOne({ where: { contactId: contact.id, type: kind, title, occurredAt }, transaction: t });
        if (dup) { rep.unchanged++; continue; }
        await Activity.create({ type: kind, title, description: txt(r.text) || null, contactId: contact.id, userId: user.id, occurredAt }, { transaction: t });
        if (txt(r.text) && kind === "note") await Note.create({ body: txt(r.text), contactId: contact.id, authorId: user.id, createdAt: occurredAt }, { transaction: t });
        rep.created++;
      }
      reports.push(rep);
    }

    // ---------------- Participant and alumnus markers
    let alumni = 0;
    for (const contactId of touchedContacts) {
      const [done, active] = await Promise.all([
        Registration.count({ where: { contactId, completionStatus: "Completed", status: { [Op.ne]: "Cancelled" } }, transaction: t }),
        Registration.count({ where: { contactId, status: { [Op.ne]: "Cancelled" } }, transaction: t }),
      ]);
      const c = await Contact.findByPk(contactId, { transaction: t });
      const patch = { isParticipant: active > 0 || c.isParticipant };
      if (done > 0) {
        patch.isAlumnus = true;
        if (!c.alumniSince) { const first = await Registration.min("completedAt", { where: { contactId, completionStatus: "Completed" }, transaction: t }); patch.alumniSince = first || new Date().toISOString().slice(0, 10); }
        if (c.contactType === "Lead") patch.contactType = "Customer";
        if (!c.isAlumnus) alumni++;
      }
      await c.update(patch, { transaction: t });
    }

    const errors = reports.reduce((a, r) => a + r.errors.length, 0);
    const written = reports.reduce((a, r) => a + r.created + r.updated, 0);
    let importId = null;
    if (dryRun) await t.rollback();
    else {
      const imp = await Import.create({ filename, entity: "program-data", uploadedBy: user.id, departmentId: dept.id, totalRows: reports.reduce((a, r) => a + r.read, 0), validRows: written, importedRows: written, invalidRows: errors, status: "completed", startedAt: new Date(), completedAt: new Date() }, { transaction: t });
      importId = imp.id;
      await t.commit();
      await recordAudit({ userId: user.id, action: `Imported program data from ${filename}: ${written} records written, ${errors} rows with problems`, module: "programs", resourceType: "Import", resourceId: importId, departmentId: dept.id });
    }
    return { dryRun, filename, reports: reports.map((r) => ({ ...r, errorCount: r.errors.length, errors: r.errors.slice(0, 100) })), errors, written, newAlumni: alumni, importId };
  } catch (err) {
    try { await t.rollback(); } catch { /* already finished */ }
    throw err;
  }
}

/** The empty template workbook (one sheet per kind of data, plus a short instructions sheet). */
export function buildTemplate() {
  const wb = XLSX.utils.book_new();
  const help = [
    ["IKL program data: migration template"],
    ["Fill the sheets you have data for; leave the others out. Keep the column names in the first row."],
    ["Order of work: Programs, Batches, Participants, Registrations, History. A row refers to earlier sheets by code or email."],
    ["Dates: YYYY-MM-DD. Fees and amounts: numbers without currency signs."],
    ["People are matched by email, programs by code (or title), batches by program and batch code, registrations by batch and person."],
    ["Allowed words: type = Open enrollment / Certificate program / In-house; status = Active / Archived;"],
    ["  batch status = Planned / Open for registration / Running / Completed / Cancelled;"],
    ["  registration_status = Registered / Confirmed / Cancelled; attendance = Registered / Attended / No Show;"],
    ["  payment_status = Unpaid / Partially paid / Paid / Waived; completion_status = In progress / Completed / Not completed;"],
    ["  History kind = note / call / meeting / email / whatsapp."],
    ["The example row in each sheet shows the layout; delete it before importing."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(help), "Read me");
  for (const [name, def] of Object.entries(TEMPLATE)) {
    const ws = XLSX.utils.aoa_to_sheet([def.columns, def.example]);
    ws["!cols"] = def.columns.map((c) => ({ wch: Math.max(14, c.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
