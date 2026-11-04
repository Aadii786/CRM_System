import "server-only";
import { Op, fn, col } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, departmentByKey, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";
import { PROGRAM_CATEGORIES, PROGRAM_TYPES, PROGRAM_STATUSES, BATCH_STATUSES } from "@/lib/constants/programs";

const { Program, ProgramBatch, ContactInterest, ContactCompany, Contact, Company, Department, Trainer, Deal } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function dateOrNull(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).slice(0, 10);
  if (!DATE_RE.test(s)) throw new Error(`Enter a valid ${label}.`);
  return s;
}
function intOrNull(value, label, { min = 0 } = {}) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) throw new Error(`${label} must be a whole number of ${min} or more.`);
  return n;
}
function moneyOrNull(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be zero or more.`);
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------- catalogue

export async function listPrograms(user, { q = "", category, programType, status = "Active", page = 1, limit = 25 } = {}) {
  requirePermission(user, "programs.view");
  const deptIds = await scopedDepartmentIds(user);
  if (!deptIds.length) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };
  if (status) where.status = status;
  if (category) where.category = category;
  if (programType) where.programType = programType;
  if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { code: { [Op.like]: `%${q}%` } }];

  const { rows, count } = await Program.findAndCountAll({ where, order: [["title", "ASC"]], limit, offset: (page - 1) * limit });
  const ids = rows.map((r) => r.id);

  const today = new Date().toISOString().slice(0, 10);
  const [batchRows, nextRows, interestRows] = ids.length
    ? await Promise.all([
        ProgramBatch.findAll({ where: { programId: { [Op.in]: ids } }, attributes: ["programId", [fn("COUNT", col("id")), "n"]], group: ["programId"], raw: true }),
        ProgramBatch.findAll({
          where: { programId: { [Op.in]: ids }, startDate: { [Op.gte]: today }, status: { [Op.notIn]: ["Cancelled", "Completed"] } },
          attributes: ["programId", [fn("MIN", col("start_date")), "next"]], group: ["programId"], raw: true,
        }),
        ContactInterest.findAll({ where: { programId: { [Op.in]: ids } }, attributes: ["programId", [fn("COUNT", col("id")), "n"]], group: ["programId"], raw: true }),
      ])
    : [[], [], []];
  const batchCount = Object.fromEntries(batchRows.map((r) => [r.programId, Number(r.n)]));
  const nextStart = Object.fromEntries(nextRows.map((r) => [r.programId, r.next]));
  const interested = Object.fromEntries(interestRows.map((r) => [r.programId, Number(r.n)]));

  return {
    data: rows.map((r) => ({ ...r.get({ plain: true }), batchCount: batchCount[r.id] || 0, nextStart: nextStart[r.id] || null, interestedCount: interested[r.id] || 0 })),
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 },
  };
}

/** Lightweight list for selects (deal form, interests): active programs with their open batches. */
export async function listProgramOptions(user) {
  requirePermission(user, "programs.view");
  const deptIds = await scopedDepartmentIds(user);
  if (!deptIds.length) return [];
  const programs = await Program.findAll({
    where: { departmentId: { [Op.in]: deptIds }, status: "Active" },
    include: [{ model: ProgramBatch, as: "batches", required: false, where: { status: { [Op.ne]: "Cancelled" } } }],
    order: [["title", "ASC"], [{ model: ProgramBatch, as: "batches" }, "startDate", "ASC"]],
  });
  return programs.map((p) => ({
    id: p.id,
    title: p.title,
    code: p.code,
    category: p.category,
    batches: (p.batches || []).map((b) => ({ id: b.id, code: b.code, startDate: b.startDate, status: b.status })),
  }));
}

export async function getProgramById(user, id) {
  requirePermission(user, "programs.view");
  const program = await Program.findByPk(id, {
    include: [
      { model: Department },
      { model: ProgramBatch, as: "batches", include: [{ model: Trainer, as: "trainer", attributes: ["id", "name"] }] },
    ],
    order: [[{ model: ProgramBatch, as: "batches" }, "startDate", "DESC"]],
  });
  if (!program) return null;
  requireDepartmentAccess(user, program.Department?.key);
  const [interestedCount, dealCount] = await Promise.all([
    ContactInterest.count({ where: { programId: program.id } }),
    Deal.count({ where: { programId: program.id } }),
  ]);
  return { program, interestedCount, dealCount };
}

async function loadProgram(user, id, permission = "training.manage") {
  requirePermission(user, permission);
  const program = await Program.findByPk(id, { include: [Department] });
  if (!program) throw new Error("Program not found.");
  requireDepartmentAccess(user, program.Department?.key);
  return program;
}

function programFields(payload, existing = {}) {
  const title = String(payload.title ?? existing.title ?? "").trim();
  if (!title) throw new Error("Give the program a title.");
  const category = payload.category ?? existing.category ?? null;
  if (category && !PROGRAM_CATEGORIES.includes(category)) throw new Error("Pick a category from the list.");
  const programType = payload.programType ?? existing.programType ?? "Open enrollment";
  if (!PROGRAM_TYPES.includes(programType)) throw new Error("Pick a program type from the list.");
  const code = String(payload.code ?? existing.code ?? "").trim() || null;
  return {
    title,
    code,
    category: category || null,
    programType,
    durationDays: payload.durationDays !== undefined ? intOrNull(payload.durationDays, "Duration (days)", { min: 1 }) : existing.durationDays ?? null,
    durationText: payload.durationText !== undefined ? String(payload.durationText || "").trim() || null : existing.durationText ?? null,
    defaultFee: payload.defaultFee !== undefined ? moneyOrNull(payload.defaultFee, "The fee") ?? 0 : existing.defaultFee ?? 0,
    description: payload.description !== undefined ? String(payload.description || "").trim() || null : existing.description ?? null,
  };
}

async function assertCodeFree(departmentId, code, exceptId = null) {
  if (!code) return;
  const clash = await Program.findOne({ where: { departmentId, code } });
  if (clash && String(clash.id) !== String(exceptId)) throw new Error(`The code ${code} is already used by "${clash.title}".`);
}

export async function createProgram(user, payload) {
  requirePermission(user, "training.manage");
  const dept = await departmentByKey(payload.departmentKey || user.department?.key);
  const allowed = await scopedDepartmentIds(user);
  if (!dept || !allowed.includes(dept.id)) throw new Error("You cannot add a program to that department.");
  const fields = programFields(payload);
  await assertCodeFree(dept.id, fields.code);
  const program = await Program.create({ ...fields, departmentId: dept.id, status: "Active", createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Created program "${program.title}"`, module: "programs", resourceType: "Program", resourceId: program.id, departmentId: dept.id });
  return program;
}

export async function updateProgram(user, id, payload) {
  const program = await loadProgram(user, id);
  const fields = programFields(payload, program.get({ plain: true }));
  await assertCodeFree(program.departmentId, fields.code, program.id);
  await program.update(fields);
  await recordAudit({ userId: user.id, action: `Updated program "${program.title}"`, module: "programs", resourceType: "Program", resourceId: id, departmentId: program.departmentId });
  return program;
}

export async function setProgramStatus(user, id, status) {
  if (!PROGRAM_STATUSES.includes(status)) throw new Error("Unknown status.");
  const program = await loadProgram(user, id);
  await program.update({ status });
  await recordAudit({ userId: user.id, action: `${status === "Archived" ? "Archived" : "Reactivated"} program "${program.title}"`, module: "programs", resourceType: "Program", resourceId: id, departmentId: program.departmentId });
  return program;
}

// ------------------------------------------------------------------ batches

function batchFields(payload, existing = {}) {
  const startDate = payload.startDate !== undefined ? dateOrNull(payload.startDate, "start date") : existing.startDate ?? null;
  const endDate = payload.endDate !== undefined ? dateOrNull(payload.endDate, "end date") : existing.endDate ?? null;
  if (startDate && endDate && endDate < startDate) throw new Error("The end date cannot be before the start date.");
  const status = payload.status ?? existing.status ?? "Planned";
  if (!BATCH_STATUSES.includes(status)) throw new Error("Pick a status from the list.");
  return {
    code: payload.code !== undefined ? String(payload.code || "").trim() || null : existing.code ?? null,
    startDate,
    endDate,
    venue: payload.venue !== undefined ? String(payload.venue || "").trim() || null : existing.venue ?? null,
    trainerId: payload.trainerId !== undefined ? intOrNull(payload.trainerId, "Trainer", { min: 1 }) : existing.trainerId ?? null,
    capacity: payload.capacity !== undefined ? intOrNull(payload.capacity, "Seats", { min: 1 }) : existing.capacity ?? null,
    fee: payload.fee !== undefined ? moneyOrNull(payload.fee, "The fee") : existing.fee ?? null,
    status,
    notes: payload.notes !== undefined ? String(payload.notes || "").trim() || null : existing.notes ?? null,
  };
}

async function assertTrainer(trainerId) {
  if (!trainerId) return;
  const t = await Trainer.findByPk(trainerId);
  if (!t) throw new Error("That trainer does not exist.");
}

export async function createBatch(user, programId, payload) {
  const program = await loadProgram(user, programId);
  if (program.status !== "Active") throw new Error("This program is archived. Reactivate it before adding a batch.");
  const fields = batchFields(payload);
  if (!fields.startDate) throw new Error("Enter the start date of the batch.");
  await assertTrainer(fields.trainerId);
  const batch = await ProgramBatch.create({ ...fields, fee: fields.fee ?? program.defaultFee, programId: program.id, createdBy: user.id });
  await recordAudit({ userId: user.id, action: `Added a batch to "${program.title}"`, module: "programs", resourceType: "ProgramBatch", resourceId: batch.id, departmentId: program.departmentId });
  return batch;
}

async function loadBatch(user, id) {
  requirePermission(user, "training.manage");
  const batch = await ProgramBatch.findByPk(id, { include: [{ model: Program, as: "program", include: [Department] }] });
  if (!batch) throw new Error("Batch not found.");
  requireDepartmentAccess(user, batch.program?.Department?.key);
  return batch;
}

export async function updateBatch(user, id, payload) {
  const batch = await loadBatch(user, id);
  const fields = batchFields(payload, batch.get({ plain: true }));
  await assertTrainer(fields.trainerId);
  await batch.update(fields);
  await recordAudit({ userId: user.id, action: `Updated a batch of "${batch.program.title}"`, module: "programs", resourceType: "ProgramBatch", resourceId: id, departmentId: batch.program.departmentId });
  return batch;
}

export async function deleteBatch(user, id) {
  const batch = await loadBatch(user, id);
  const linked = await Deal.count({ where: { batchId: id } });
  if (linked) throw new Error(`${linked} inquiry(ies) are linked to this batch. Cancel it instead of deleting it.`);
  await batch.destroy();
  await recordAudit({ userId: user.id, action: `Deleted a batch of "${batch.program.title}"`, module: "programs", resourceType: "ProgramBatch", resourceId: id, departmentId: batch.program.departmentId });
}

export async function listTrainers(user) {
  requirePermission(user, "programs.view");
  const trainers = await Trainer.findAll({ where: { status: "Active" }, order: [["name", "ASC"]] });
  return trainers.map((t) => ({ id: t.id, name: t.name, specialization: t.specialization }));
}

// ------------------------------------------------- one person: interests etc.

async function loadContact(user, contactId, permission) {
  requirePermission(user, permission);
  const contact = await Contact.findByPk(contactId, { include: [Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);
  return contact;
}

export async function listContactInterests(user, contactId) {
  await loadContact(user, contactId, "contacts.view");
  const rows = await ContactInterest.findAll({
    where: { contactId },
    include: [{ model: Program, as: "program", attributes: ["id", "title", "category"] }],
    order: [["createdAt", "DESC"]],
  });
  return rows.map((r) => r.get({ plain: true }));
}

/** Adds an interest: a specific program, or a whole category. Several are allowed. */
export async function addContactInterest(user, contactId, { programId, category }) {
  const contact = await loadContact(user, contactId, "contacts.update");
  let where;
  if (programId) {
    const program = await Program.findByPk(programId);
    if (!program || program.departmentId !== contact.departmentId) throw new Error("Pick a program from this department's catalogue.");
    where = { contactId: contact.id, programId: program.id };
  } else if (category) {
    if (!PROGRAM_CATEGORIES.includes(category)) throw new Error("Pick a category from the list.");
    where = { contactId: contact.id, programId: null, category };
  } else {
    throw new Error("Choose a program or a category.");
  }
  const existing = await ContactInterest.findOne({ where });
  if (existing) return existing;
  const created = await ContactInterest.create({ ...where, category: where.category || null });
  await contact.update({ lastActivityAt: new Date() });
  await recordAudit({ userId: user.id, action: "Added a program interest", module: "contacts", resourceType: "Contact", resourceId: contact.id, departmentId: contact.departmentId });
  return created;
}

export async function removeContactInterest(user, interestId) {
  const interest = await ContactInterest.findByPk(interestId);
  if (!interest) throw new Error("Interest not found.");
  await loadContact(user, interest.contactId, "contacts.update");
  await interest.destroy();
}

export async function listContactOrganizations(user, contactId) {
  await loadContact(user, contactId, "contacts.view");
  const rows = await ContactCompany.findAll({ where: { contactId }, include: [{ model: Company, attributes: ["id", "name", "industry"] }], order: [["createdAt", "ASC"]] });
  return rows.map((r) => r.get({ plain: true }));
}

export async function addContactOrganization(user, contactId, { companyId, jobTitle }) {
  const contact = await loadContact(user, contactId, "contacts.update");
  const company = await Company.findByPk(companyId);
  if (!company || company.departmentId !== contact.departmentId) throw new Error("Pick a company from this department.");
  if (String(contact.companyId) === String(company.id)) throw new Error("That is already this person's main organization.");
  const existing = await ContactCompany.findOne({ where: { contactId: contact.id, companyId: company.id } });
  if (existing) throw new Error("That organization is already linked.");
  const row = await ContactCompany.create({ contactId: contact.id, companyId: company.id, jobTitle: String(jobTitle || "").trim() || null });
  await recordAudit({ userId: user.id, action: `Linked ${contact.firstName} ${contact.lastName} to ${company.name}`, module: "contacts", resourceType: "Contact", resourceId: contact.id, departmentId: contact.departmentId });
  return row;
}

export async function removeContactOrganization(user, linkId) {
  const link = await ContactCompany.findByPk(linkId);
  if (!link) throw new Error("Link not found.");
  await loadContact(user, link.contactId, "contacts.update");
  await link.destroy();
}
