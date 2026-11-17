import "server-only";
import { Op, fn, col } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";
import { fireTrigger } from "./automationEngine";
import {
  REGISTRATION_STATUSES, ATTENDANCE_STATUSES, PAYMENT_STATUSES,
} from "@/lib/constants/programs";

const { Registration, Program, ProgramBatch, Contact, Company, ContactCompany, Department, Activity, Participant, TrainingProgram, Trainer, Deal } = db;

/**
 * Registrations (IKL Sprint 3): who is on which batch of an open-enrollment program.
 * One row per person per batch (the person is always the master contact record).
 * A company nomination is several rows that share one nomination reference.
 * Attendance, completion + certificate record, payment reference and program
 * feedback live on the same row. Completing a program makes the person an alumnus.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const clean = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

function money(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be zero or more.`);
  return Math.round(n * 100) / 100;
}
function dateOrNull(value, label) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!DATE_RE.test(s)) throw new Error(`Enter a valid ${label}.`);
  return s;
}

async function scopedDepartmentIds(user) {
  return departmentIdsForKeys(getAccessibleDepartmentKeys(user, await allDepartmentKeys()));
}

// ------------------------------------------------------------------- loaders

async function loadBatch(user, batchId, permission) {
  requirePermission(user, permission);
  const batch = await ProgramBatch.findByPk(batchId, { include: [{ model: Program, as: "program", include: [Department] }, { model: Trainer, as: "trainer", attributes: ["id", "name"] }] });
  if (!batch) throw new Error("Batch not found.");
  requireDepartmentAccess(user, batch.program?.Department?.key);
  return batch;
}

async function loadRegistration(user, id, permission = "training.manage") {
  requirePermission(user, permission);
  const reg = await Registration.findByPk(id, {
    include: [
      { model: Program, as: "program", include: [Department] },
      { model: ProgramBatch, as: "batch" },
      { model: Contact, as: "contact" },
    ],
  });
  if (!reg) throw new Error("Registration not found.");
  requireDepartmentAccess(user, reg.program?.Department?.key);
  return reg;
}

export async function seatsTaken(batchId) {
  return Registration.count({ where: { batchId, status: { [Op.ne]: "Cancelled" } } });
}

// -------------------------------------------------------------- one person

/** Finds the person by email in the department, or creates the contact. Keeps one record per person. */
export async function findOrCreateContact({ departmentId, ownerId, source = "Other", person }) {
  const email = String(person.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) throw new Error("Enter a valid email address so the person stays one record across the CRM.");
  let contact = await Contact.findOne({ where: { departmentId, email } });
  if (contact) return { contact, created: false };
  const parts = String(person.name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) throw new Error("Enter the person's name.");
  contact = await Contact.create({
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    email,
    phone: clean(person.phone),
    jobTitle: clean(person.designation),
    companyId: person.companyId || null,
    departmentId,
    ownerId: ownerId || null,
    source,
    contactType: "Customer",
    status: "New",
    engagementStatus: "Inactive",
    leadScore: 0,
  });
  return { contact, created: true };
}

/**
 * Core insert, shared by staff screens and the website. Enforces the seat limit, the batch state
 * and "one place per person per batch". Reactivates a cancelled registration instead of duplicating it.
 */
export async function createRegistrationRecord({ batch, program, contact, companyId = null, source = "Manual", createdBy = null, fee = null, nominationRef = null }) {
  if (["Cancelled", "Completed"].includes(batch.status)) throw new Error(`Registration is closed: this batch is ${batch.status.toLowerCase()}.`);
  if (program.status !== "Active") throw new Error("This program is archived.");

  const existing = await Registration.findOne({ where: { batchId: batch.id, contactId: contact.id } });
  if (existing && existing.status !== "Cancelled") throw new Error(`${contact.firstName} ${contact.lastName} is already registered for this batch.`);

  if (batch.capacity) {
    const taken = await seatsTaken(batch.id);
    if (taken >= batch.capacity) throw new Error(`No seats left: all ${batch.capacity} seats of this batch are taken. Raise the seats on the batch if more people can attend.`);
  }
  const amount = fee ?? (batch.fee != null ? Number(batch.fee) : Number(program.defaultFee || 0));

  let reg;
  if (existing) {
    await existing.update({ status: "Registered", attendance: "Registered", fee: amount, companyId: companyId || existing.companyId, source, nominationRef, createdBy });
    reg = existing;
  } else {
    reg = await Registration.create({
      departmentId: program.departmentId, programId: program.id, batchId: batch.id, contactId: contact.id,
      companyId, nominationRef, source, status: "Registered", attendance: "Registered", fee: amount,
      paymentStatus: amount > 0 ? "Unpaid" : "Paid", createdBy,
    });
  }
  await contact.update({ isParticipant: true, lastActivityAt: new Date() });
  await Activity.create({
    type: "system",
    title: `Registered for ${program.title}${batch.code ? ` (${batch.code})` : ""}`,
    contactId: contact.id, companyId, userId: createdBy, occurredAt: new Date(),
  });
  return reg;
}

export async function registerParticipant(user, batchId, payload) {
  const batch = await loadBatch(user, batchId, "training.manage");
  const program = batch.program;
  const companyId = payload.companyId ? Number(payload.companyId) : null;
  if (companyId) {
    const company = await Company.findByPk(companyId);
    if (!company || company.departmentId !== program.departmentId) throw new Error("Pick a company from this department.");
  }
  const { contact, created } = await findOrCreateContact({ departmentId: program.departmentId, ownerId: user.id, person: { ...payload, companyId } });
  const reg = await createRegistrationRecord({
    batch, program, contact, companyId: companyId || contact.companyId || null,
    source: "Manual", createdBy: user.id, fee: money(payload.fee, "The fee"),
  });
  await recordAudit({ userId: user.id, action: `Registered ${contact.firstName} ${contact.lastName} for "${program.title}"${created ? " (new contact)" : ""}`, module: "programs", resourceType: "Registration", resourceId: reg.id, departmentId: program.departmentId });
  await fireTrigger("registration_created", contact, { programId: program.id, batchId: batch.id });
  return { registration: reg, createdContact: created };
}

/** "Name, email, designation, phone" per line (also accepts tab or semicolon separators). */
export function parseNominationText(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [name, email, designation, phone] = line.split(/\t|;|,/).map((p) => p.trim());
      return { line: i + 1, name, email, designation, phone };
    });
}

/** A company nominates several people for one batch. Each person that cannot be registered is reported, the others go through. */
export async function registerNomination(user, batchId, { companyId, people, fee }) {
  const batch = await loadBatch(user, batchId, "training.manage");
  const program = batch.program;
  const company = await Company.findByPk(companyId);
  if (!company || company.departmentId !== program.departmentId) throw new Error("Pick the nominating company.");
  if (!people?.length) throw new Error("Add at least one person: one per line as Name, email, designation, phone.");
  if (people.length > 100) throw new Error("A nomination can hold up to 100 people at a time.");

  const ref = `NOM-${Date.now().toString(36).toUpperCase()}`;
  const registered = [];
  const skipped = [];
  for (const person of people) {
    try {
      const { contact } = await findOrCreateContact({ departmentId: program.departmentId, ownerId: user.id, person: { ...person, companyId: company.id } });
      if (!contact.companyId) await contact.update({ companyId: company.id });
      else if (contact.companyId !== company.id) {
        await ContactCompany.findOrCreate({ where: { contactId: contact.id, companyId: company.id }, defaults: { jobTitle: clean(person.designation) } });
      }
      const reg = await createRegistrationRecord({ batch, program, contact, companyId: company.id, source: "Nomination", createdBy: user.id, fee: money(fee, "The fee"), nominationRef: ref });
      registered.push(reg);
      await fireTrigger("registration_created", contact, { programId: program.id, batchId: batch.id });
    } catch (err) {
      skipped.push({ line: person.line, name: person.name || person.email || `line ${person.line}`, reason: err.message });
    }
  }
  if (registered.length) {
    await recordAudit({ userId: user.id, action: `Registered ${registered.length} nominee(s) of ${company.name} for "${program.title}" (${ref})`, module: "programs", resourceType: "Registration", resourceId: registered[0].id, departmentId: program.departmentId });
  }
  return { reference: ref, registered: registered.length, skipped };
}

// ------------------------------------------------------------- updating rows

export async function updateRegistration(user, id, payload) {
  const reg = await loadRegistration(user, id);
  const patch = {};
  if (payload.status !== undefined) {
    if (!REGISTRATION_STATUSES.includes(payload.status)) throw new Error("Pick a status from the list.");
    patch.status = payload.status;
  }
  if (payload.fee !== undefined) patch.fee = money(payload.fee, "The fee") ?? 0;
  if (payload.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(payload.paymentStatus)) throw new Error("Pick a payment status from the list.");
    patch.paymentStatus = payload.paymentStatus;
  }
  if (payload.amountPaid !== undefined) patch.amountPaid = money(payload.amountPaid, "The amount paid") ?? 0;
  if (payload.invoiceNumber !== undefined) patch.invoiceNumber = clean(payload.invoiceNumber);
  if (payload.notes !== undefined) patch.notes = clean(payload.notes);
  if (patch.status === "Registered" && reg.status === "Cancelled") {
    // Reactivating takes a seat again.
    const batch = reg.batch;
    if (batch.capacity && (await seatsTaken(batch.id)) >= batch.capacity) throw new Error("No seats left in this batch.");
  }
  await reg.update(patch);
  await recordAudit({ userId: user.id, action: `Updated registration of ${reg.contact?.firstName || ""} ${reg.contact?.lastName || ""} in "${reg.program.title}"`.replace(/\s+/g, " "), module: "programs", resourceType: "Registration", resourceId: id, departmentId: reg.departmentId });
  if (patch.status === "Cancelled") await syncAlumni(reg.contactId);
  return reg;
}

export async function setAttendance(user, id, attendance) {
  if (!ATTENDANCE_STATUSES.includes(attendance)) throw new Error("Pick Registered, Attended or No Show.");
  const reg = await loadRegistration(user, id);
  if (reg.status === "Cancelled") throw new Error("This registration is cancelled.");
  await reg.update({ attendance, ...(attendance !== "Attended" && reg.completionStatus === "Completed" ? { completionStatus: "In progress", completedAt: null } : {}) });
  if (attendance === "Attended") await Contact.update({ lastActivityAt: new Date() }, { where: { id: reg.contactId } });
  await syncAlumni(reg.contactId);
  await recordAudit({ userId: user.id, action: `Marked attendance "${attendance}" in "${reg.program.title}"`, module: "programs", resourceType: "Registration", resourceId: id, departmentId: reg.departmentId });
  return reg;
}

export async function setAttendanceBulk(user, batchId, ids, attendance) {
  if (!ATTENDANCE_STATUSES.includes(attendance)) throw new Error("Pick Registered, Attended or No Show.");
  const batch = await loadBatch(user, batchId, "training.manage");
  const where = { batchId: batch.id, status: { [Op.ne]: "Cancelled" } };
  if (ids?.length) where.id = { [Op.in]: ids.map(Number) };
  const regs = await Registration.findAll({ where });
  for (const r of regs) {
    await r.update({ attendance, ...(attendance !== "Attended" && r.completionStatus === "Completed" ? { completionStatus: "In progress", completedAt: null } : {}) });
    await syncAlumni(r.contactId);
  }
  await recordAudit({ userId: user.id, action: `Marked ${regs.length} participant(s) "${attendance}" in "${batch.program.title}"`, module: "programs", resourceType: "ProgramBatch", resourceId: batch.id, departmentId: batch.program.departmentId });
  return { updated: regs.length };
}

/** Completion rule: a person who ATTENDED can be marked Completed; that makes them an alumnus. */
export async function completeRegistration(user, id, payload = {}) {
  const reg = await loadRegistration(user, id);
  if (reg.status === "Cancelled") throw new Error("This registration is cancelled.");
  if (reg.attendance !== "Attended") throw new Error("Mark the person as Attended before completing the program.");
  const issued = payload.certificateIssued === true || payload.certificateIssued === "on" || payload.certificateIssued === "true" || Boolean(clean(payload.certificateNumber));
  const certificateDate = dateOrNull(payload.certificateDate, "certificate date") || (issued ? today() : null);
  await reg.update({
    completionStatus: "Completed",
    completedAt: reg.completedAt || today(),
    certificateIssued: issued,
    certificateNumber: clean(payload.certificateNumber),
    certificateDate: issued ? certificateDate : null,
  });
  const becameAlumnus = await syncAlumni(reg.contactId);
  await Activity.create({ type: "system", title: `Completed ${reg.program.title}${issued ? " (certificate recorded)" : ""}`, contactId: reg.contactId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Completed "${reg.program.title}" for ${reg.contact?.firstName} ${reg.contact?.lastName}`, module: "programs", resourceType: "Registration", resourceId: id, departmentId: reg.departmentId });
  if (becameAlumnus && reg.contact) await fireTrigger("program_completed", reg.contact, { programId: reg.programId, batchId: reg.batchId });
  return reg;
}

export async function reopenCompletion(user, id, status = "In progress") {
  const reg = await loadRegistration(user, id);
  if (!["In progress", "Not completed"].includes(status)) throw new Error("Unknown status.");
  await reg.update({ completionStatus: status, completedAt: null, certificateIssued: false, certificateNumber: null, certificateDate: null });
  await syncAlumni(reg.contactId);
  await recordAudit({ userId: user.id, action: `Set completion to "${status}" in "${reg.program.title}"`, module: "programs", resourceType: "Registration", resourceId: id, departmentId: reg.departmentId });
  return reg;
}

/** Closes a batch: everyone who attended is marked Completed (certificate numbers can be added later per person). */
export async function completeBatch(user, batchId) {
  const batch = await loadBatch(user, batchId, "training.manage");
  const regs = await Registration.findAll({ where: { batchId: batch.id, status: { [Op.ne]: "Cancelled" }, attendance: "Attended", completionStatus: { [Op.ne]: "Completed" } }, include: [{ model: Contact, as: "contact" }] });
  let alumni = 0;
  for (const r of regs) {
    await r.update({ completionStatus: "Completed", completedAt: today() });
    if (await syncAlumni(r.contactId)) {
      alumni += 1;
      if (r.contact) await fireTrigger("program_completed", r.contact, { programId: batch.programId, batchId: batch.id });
    }
  }
  await batch.update({ status: "Completed" });
  await recordAudit({ userId: user.id, action: `Closed batch of "${batch.program.title}": ${regs.length} completed`, module: "programs", resourceType: "ProgramBatch", resourceId: batch.id, departmentId: batch.program.departmentId });
  return { completed: regs.length, newAlumni: alumni };
}

// ------------------------------------------------------------------ feedback

export function validateFeedback({ score, comments }) {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("The feedback score must be a whole number from 1 to 5.");
  return { feedbackScore: n, feedbackComments: clean(comments) };
}

export async function recordFeedback(user, id, payload) {
  const reg = await loadRegistration(user, id);
  const f = validateFeedback(payload);
  await reg.update({ ...f, feedbackAt: new Date() });
  await Activity.create({ type: "system", title: `Feedback for ${reg.program.title}: ${f.feedbackScore}/5`, description: f.feedbackComments, contactId: reg.contactId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Recorded program feedback (${f.feedbackScore}/5) for "${reg.program.title}"`, module: "programs", resourceType: "Registration", resourceId: id, departmentId: reg.departmentId });
  return reg;
}

// ------------------------------------------------------------------- alumni

/**
 * Alumnus rule: a person who completed at least one program (a batch registration marked
 * Completed, or an in-house participant who attended an engagement that is Completed).
 * Returns true when the person is an alumnus afterwards.
 */
export async function syncAlumni(contactId) {
  const contact = await Contact.findByPk(contactId);
  if (!contact) return false;
  const [completedRegs, activeRegs, inhouse] = await Promise.all([
    Registration.findAll({ where: { contactId, completionStatus: "Completed", status: { [Op.ne]: "Cancelled" } }, attributes: ["completedAt"], raw: true }),
    Registration.count({ where: { contactId, status: { [Op.ne]: "Cancelled" } } }),
    Participant.findAll({ where: { contactId }, include: [{ model: TrainingProgram, attributes: ["status", "endDate"] }], raw: true, nest: true }),
  ]);
  const inhouseDone = inhouse.filter((p) => p.attendance === "Attended" && p.TrainingProgram?.status === "Completed");
  const isAlumnus = completedRegs.length > 0 || inhouseDone.length > 0;
  const dates = [...completedRegs.map((r) => r.completedAt), ...inhouseDone.map((p) => p.TrainingProgram?.endDate)].filter(Boolean).map(String).sort();
  const patch = {
    isParticipant: activeRegs > 0 || inhouse.length > 0,
    isAlumnus,
    alumniSince: isAlumnus ? contact.alumniSince || dates[0] || today() : null,
  };
  if (isAlumnus && contact.contactType === "Lead") patch.contactType = "Customer";
  await contact.update(patch);
  return isAlumnus;
}

// ------------------------------------------------------------------- reading

function plain(rows) {
  return rows.map((r) => r.get({ plain: true }));
}

const REG_INCLUDE = [
  { model: Contact, as: "contact", attributes: ["id", "firstName", "lastName", "email", "phone", "jobTitle", "isAlumnus"] },
  { model: Company, as: "company", attributes: ["id", "name"] },
  { model: Program, as: "program", attributes: ["id", "title", "code"] },
  { model: ProgramBatch, as: "batch", attributes: ["id", "code", "startDate", "endDate", "status"] },
];

export async function getBatchRoster(user, batchId) {
  const batch = await loadBatch(user, batchId, "programs.view");
  const rows = await Registration.findAll({ where: { batchId: batch.id }, include: REG_INCLUDE, order: [["createdAt", "ASC"]] });
  const regs = plain(rows);
  const active = regs.filter((r) => r.status !== "Cancelled");
  const scores = active.filter((r) => r.feedbackScore).map((r) => r.feedbackScore);
  const stats = {
    seats: batch.capacity || null,
    taken: active.length,
    attended: active.filter((r) => r.attendance === "Attended").length,
    noShow: active.filter((r) => r.attendance === "No Show").length,
    completed: active.filter((r) => r.completionStatus === "Completed").length,
    certificates: active.filter((r) => r.certificateIssued).length,
    feedbackCount: scores.length,
    feedbackAverage: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    expected: active.reduce((a, r) => a + Number(r.fee || 0), 0),
    paid: active.reduce((a, r) => a + Number(r.amountPaid || 0), 0),
  };
  return { batch: batch.get({ plain: true }), program: batch.program.get({ plain: true }), registrations: regs, stats };
}

/** Per-batch counts for the program page (seats used, attended, completed, average feedback). */
export async function getBatchStatsForProgram(user, programId) {
  requirePermission(user, "programs.view");
  const rows = await Registration.findAll({
    where: { programId, status: { [Op.ne]: "Cancelled" } },
    attributes: [
      "batchId",
      [fn("COUNT", col("id")), "taken"],
      [fn("SUM", db.sequelize.literal("CASE WHEN attendance = 'Attended' THEN 1 ELSE 0 END")), "attended"],
      [fn("SUM", db.sequelize.literal("CASE WHEN completion_status = 'Completed' THEN 1 ELSE 0 END")), "completed"],
      [fn("AVG", col("feedback_score")), "avgScore"],
    ],
    group: ["batchId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.batchId, { taken: Number(r.taken), attended: Number(r.attended), completed: Number(r.completed), avgScore: r.avgScore != null ? Math.round(Number(r.avgScore) * 10) / 10 : null }]));
}

export async function listRegistrations(user, { q = "", programId, batchId, status, attendance, completion, paymentStatus, companyId, from, to, source, page = 1, limit = 25 } = {}) {
  requirePermission(user, "programs.view");
  const deptIds = await scopedDepartmentIds(user);
  if (!deptIds.length) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  const where = { departmentId: { [Op.in]: deptIds } };
  if (programId) where.programId = Number(programId);
  if (batchId) where.batchId = Number(batchId);
  if (status) where.status = status;
  if (attendance) where.attendance = attendance;
  if (completion) where.completionStatus = completion;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (companyId) where.companyId = Number(companyId);
  if (source) where.source = source;
  const day = (s) => (DATE_RE.test(s || "") ? new Date(`${s}T00:00:00`) : null);
  const a = day(from), b = day(to);
  if (a || b) where.createdAt = { ...(a ? { [Op.gte]: a } : {}), ...(b ? { [Op.lt]: new Date(b.getTime() + 86400000) } : {}) };

  const include = REG_INCLUDE.map((i) => ({ ...i }));
  if (q) {
    const like = { [Op.like]: `%${q}%` };
    include[0] = { ...include[0], required: true, where: { [Op.or]: [{ firstName: like }, { lastName: like }, { email: like }] } };
  }
  const { rows, count } = await Registration.findAndCountAll({ where, include, order: [["createdAt", "DESC"]], limit, offset: (page - 1) * limit, distinct: true });
  return { data: plain(rows), pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

/** Everything one person has done with IKL programs: batches, in-house trainings and inquiries (CRM-3.7). */
export async function getContactProgramHistory(user, contactId) {
  requirePermission(user, "programs.view");
  requirePermission(user, "contacts.view");
  const contact = await Contact.findByPk(contactId, { include: [Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);
  const [regs, parts, deals] = await Promise.all([
    Registration.findAll({ where: { contactId }, include: REG_INCLUDE, order: [["createdAt", "DESC"]] }),
    Participant.findAll({ where: { contactId }, include: [{ model: TrainingProgram, include: [{ model: Company, attributes: ["id", "name"] }] }], order: [["createdAt", "DESC"]] }),
    Deal.findAll({ where: { contactId, programId: { [Op.ne]: null } }, include: [{ model: Program, as: "program", attributes: ["id", "title"] }], attributes: ["id", "name", "status", "programId", "createdAt"], order: [["createdAt", "DESC"]] }),
  ]);
  return { registrations: plain(regs), inhouse: plain(parts), inquiries: plain(deals) };
}

/** Program history against a client company: its nominees' registrations and its in-house engagements. */
export async function getCompanyProgramHistory(user, companyId) {
  requirePermission(user, "programs.view");
  const company = await Company.findByPk(companyId, { include: [Department] });
  if (!company) throw new Error("Company not found.");
  requireDepartmentAccess(user, company.Department?.key);
  const [regs, engagements] = await Promise.all([
    Registration.findAll({ where: { companyId }, include: REG_INCLUDE, order: [["createdAt", "DESC"]], limit: 200 }),
    TrainingProgram.findAll({ where: { companyId }, order: [["startDate", "DESC"]], limit: 50 }),
  ]);
  return { registrations: plain(regs), engagements: plain(engagements) };
}

/** For the registration forms: active programs with their batches that still accept people. */
export async function listOpenBatches(user) {
  requirePermission(user, "programs.view");
  const deptIds = await scopedDepartmentIds(user);
  if (!deptIds.length) return [];
  const batches = await ProgramBatch.findAll({
    where: { status: { [Op.in]: ["Planned", "Open for registration", "Running"] } },
    include: [{ model: Program, as: "program", where: { departmentId: { [Op.in]: deptIds }, status: "Active" }, attributes: ["id", "title", "code"] }],
    order: [["startDate", "ASC"]],
  });
  const taken = await Registration.findAll({ where: { batchId: { [Op.in]: batches.map((b) => b.id) }, status: { [Op.ne]: "Cancelled" } }, attributes: ["batchId", [fn("COUNT", col("id")), "n"]], group: ["batchId"], raw: true });
  const takenBy = Object.fromEntries(taken.map((t) => [t.batchId, Number(t.n)]));
  return batches.map((b) => ({
    id: b.id, programId: b.program.id, programTitle: b.program.title, code: b.code, startDate: b.startDate,
    seats: b.capacity, taken: takenBy[b.id] || 0, fee: b.fee,
  }));
}
