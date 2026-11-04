import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, getAccessibleDepartmentKeys, hasPermission } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";
import { referencePrefixFor, formatReferenceNumber } from "@/lib/constants/departments";

const { Pipeline, PipelineStage, Deal, Company, Contact, User, Department, Task, Meeting, Note, Activity, TrainingProgram, TNA, Proposal, Invoice, Payment, Program, ProgramBatch } = db;

async function scopedDepartmentIds(user) {
  const keys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  return departmentIdsForKeys(keys);
}

/**
 * Generates the next "IKL-2026-0001"-style reference number for a new
 * query/deal, scoped per department per year. Not airtight against a
 * concurrent double-create (rare in this demo), but the DB-level unique
 * index on reference_number is the actual safety net.
 */
async function generateReferenceNumber(departmentKey, departmentId) {
  const prefix = referencePrefixFor(departmentKey);
  const year = new Date().getFullYear();
  const count = await Deal.count({
    where: { departmentId, referenceNumber: { [Op.like]: `${prefix}-${year}-%` } },
    paranoid: false,
  });
  return formatReferenceNumber(prefix, year, count + 1);
}

/** Checks a program / batch belongs to the department (and the batch to the program). */
async function validateProgramLink(departmentId, programId, batchId) {
  if (!programId) return { programId: null, batchId: null };
  const program = await Program.findByPk(programId);
  if (!program || program.departmentId !== departmentId) throw new Error("Pick a program from this department's catalogue.");
  if (!batchId) return { programId: program.id, batchId: null };
  const batch = await ProgramBatch.findByPk(batchId);
  if (!batch || batch.programId !== program.id) throw new Error("That batch does not belong to the chosen program.");
  return { programId: program.id, batchId: batch.id };
}

export async function listPipelines(user) {
  requirePermission(user, "deals.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return [];
  return Pipeline.findAll({
    where: { departmentId: { [Op.in]: deptIds } },
    include: [{ model: PipelineStage, as: "stages", separate: true, order: [["order", "ASC"]] }],
    order: [["isDefault", "DESC"]],
  });
}

/** Deals grouped by stage for the Kanban board (requirements #32-#33). */
export async function getPipelineBoard(user, pipelineId) {
  requirePermission(user, "deals.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return null;

  const pipeline = await Pipeline.findOne({
    where: { id: pipelineId, departmentId: { [Op.in]: deptIds } },
    include: [{ model: PipelineStage, as: "stages", separate: true, order: [["order", "ASC"]] }],
  });
  if (!pipeline) return null;

  // Every deal in the pipeline, not just open ones - otherwise a deal
  // moved to a won/lost terminal stage (e.g. "Completed", "Rejected")
  // would immediately vanish from the board instead of visibly sitting in
  // that column.
  const deals = await Deal.findAll({
    where: { pipelineId },
    include: [
      { model: Company, attributes: ["id", "name"] },
      { model: Contact, as: "contact", attributes: ["id", "firstName", "lastName"] },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
    ],
    order: [["updatedAt", "DESC"]],
  });

  const byStage = {};
  for (const stage of pipeline.stages) byStage[stage.id] = [];
  for (const deal of deals) {
    if (!byStage[deal.stageId]) byStage[deal.stageId] = [];
    byStage[deal.stageId].push(deal);
  }

  return { pipeline, byStage };
}

export async function getDeals(user, { page = 1, limit = 25, status, q } = {}) {
  requirePermission(user, "deals.view");
  const deptIds = await scopedDepartmentIds(user);
  if (deptIds.length === 0) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

  const where = { departmentId: { [Op.in]: deptIds } };
  if (status) where.status = status;
  if (q) where.name = { [Op.like]: `%${q}%` };

  const { rows, count } = await Deal.findAndCountAll({
    where,
    include: [
      { model: Company, attributes: ["id", "name"] },
      { model: PipelineStage, as: "stage" },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
    ],
    order: [["updatedAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 1 } };
}

export async function getDealById(user, id) {
  requirePermission(user, "deals.view");
  const deal = await Deal.findByPk(id, {
    include: [
      { model: Company },
      { model: Contact, as: "contact" },
      { model: User, as: "owner", attributes: ["id", "name", "avatarColor"] },
      { model: Department },
      { model: PipelineStage, as: "stage" },
      { model: Pipeline },
      { model: Program, as: "program", attributes: ["id", "title", "code"] },
      { model: ProgramBatch, as: "batch", attributes: ["id", "code", "startDate"] },
    ],
  });
  if (!deal) return null;
  requireDepartmentAccess(user, deal.Department?.key);
  return deal;
}

export async function getDealRelated(user, dealId) {
  requirePermission(user, "deals.view");
  const [tasks, meetings, notes, activities, trainingPrograms, tnas, proposals, invoices] = await Promise.all([
    Task.findAll({ where: { dealId }, order: [["dueDate", "ASC"]] }),
    Meeting.findAll({ where: { dealId }, order: [["startAt", "DESC"]] }),
    Note.findAll({ where: { dealId }, include: [{ model: User, as: "author", attributes: ["id", "name"] }], order: [["createdAt", "DESC"]] }),
    Activity.findAll({ where: { dealId }, order: [["occurredAt", "DESC"]], limit: 30 }),
    TrainingProgram.findAll({ where: { dealId }, include: [{ model: db.Trainer }, { model: db.Participant, as: "participants" }] }),
    TNA.findAll({ where: { dealId } }),
    Proposal.findAll({
      where: { dealId },
      include: [{ model: User, as: "createdBy", attributes: ["id", "name"] }, { model: User, as: "approvedBy", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
    }),
    Invoice.findAll({ where: { dealId }, include: [{ model: Payment }], order: [["createdAt", "DESC"], [Payment, "paidAt", "DESC"]] }),
  ]);
  return { tasks, meetings, notes, activities, trainingPrograms, tnas, proposals, invoices };
}

export async function createDeal(user, payload) {
  requirePermission(user, "deals.create");
  const stage = await PipelineStage.findByPk(payload.stageId);
  if (!stage) throw new Error("Invalid stage.");
  const pipeline = await Pipeline.findByPk(stage.pipelineId);
  const department = await Department.findByPk(pipeline.departmentId);
  const referenceNumber = await generateReferenceNumber(department.key, pipeline.departmentId);
  const link = await validateProgramLink(pipeline.departmentId, payload.programId, payload.batchId);

  const deal = await Deal.create({
    referenceNumber,
    name: payload.name,
    pipelineId: pipeline.id,
    stageId: stage.id,
    companyId: payload.companyId || null,
    contactId: payload.contactId || null,
    ownerId: payload.ownerId || user.id,
    departmentId: pipeline.departmentId,
    value: payload.value || 0,
    probability: stage.probability,
    expectedCloseDate: payload.expectedCloseDate || null,
    source: payload.source || "Other",
    trainingType: payload.trainingType || null,
    programId: link.programId,
    batchId: link.batchId,
    lastActivityAt: new Date(),
  });

  await Activity.create({ type: "system", title: "Deal created", dealId: deal.id, companyId: deal.companyId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: "Created deal", module: "deals", resourceType: "Deal", resourceId: deal.id });
  return deal;
}

/** Moves a deal to a new stage (requirements #83: dropdown-based, no DnD library). */
export async function moveDealStage(user, dealId, stageId) {
  requirePermission(user, "deals.move_stage");
  const deal = await Deal.findByPk(dealId, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);

  const stage = await PipelineStage.findByPk(stageId);
  if (!stage) throw new Error("Invalid stage.");

  const previousStage = await PipelineStage.findByPk(deal.stageId);
  // Approval gate: leaving the "Approval" stage requires deals.approve
  // (IKL/HSM Managers only) - Executives can move a deal INTO Approval,
  // but only a Manager can release it from there into Execution or
  // anywhere else.
  if (previousStage?.key === "approval" && !hasPermission(user, "deals.approve")) {
    throw new Error("Only the Head of Department can approve a deal out of the Approval stage.");
  }

  const previousStageName = previousStage?.name;
  const status = stage.isWon ? "won" : stage.isLost ? "lost" : "open";

  await deal.update({
    stageId,
    probability: stage.probability,
    status,
    closedAt: status !== "open" ? new Date() : null,
    lastActivityAt: new Date(),
  });

  await Activity.create({
    type: "deal_stage",
    title: `Deal moved to ${stage.name}`,
    description: previousStageName ? `Previously ${previousStageName}` : null,
    dealId: deal.id,
    companyId: deal.companyId,
    userId: user.id,
    occurredAt: new Date(),
  });

  // Winning a deal converts the lead: the contact becomes a Converted customer
  // and the company an Active client (CRM-2.10), without anyone editing them by hand.
  if (status === "won") await markLeadConverted(user, deal);

  await recordAudit({ userId: user.id, action: `Moved deal to ${stage.name}`, module: "deals", resourceType: "Deal", resourceId: dealId });
  return deal;
}

async function markLeadConverted(user, deal) {
  if (deal.contactId) {
    const contact = await Contact.findByPk(deal.contactId);
    if (contact && contact.status !== "Converted") {
      await contact.update({ status: "Converted", contactType: contact.contactType === "Partner" ? contact.contactType : "Customer" });
      await Activity.create({ type: "status_change", title: "Lead converted to customer", description: `Deal won: ${deal.name}`, contactId: contact.id, dealId: deal.id, companyId: deal.companyId, userId: user.id, occurredAt: new Date() });
    }
  }
  if (deal.companyId) {
    const company = await Company.findByPk(deal.companyId);
    if (company && company.status !== "Active") await company.update({ status: "Active" });
  }
}

export class OpenDealExistsError extends Error {
  constructor(deal) {
    super(`This contact already has an open opportunity (${deal.referenceNumber || deal.name}).`);
    this.name = "OpenDealExistsError";
    this.existingDealId = deal.id;
  }
}

/**
 * One-click "Convert to opportunity": opens a deal in the first stage of the
 * contact's department pipeline, links the contact and company, and moves the
 * contact on to Qualified (CRM-2.10). The contact becomes Converted
 * automatically when that deal is won (see moveDealStage).
 */
export async function convertContactToDeal(user, contactId, payload = {}) {
  requirePermission(user, "deals.create");
  const contact = await Contact.findByPk(contactId, { include: [{ model: Company }, { model: Department }] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);

  const existing = await Deal.findOne({ where: { contactId: contact.id, status: "open" } });
  if (existing) throw new OpenDealExistsError(existing);

  const pipeline = await Pipeline.findOne({ where: { departmentId: contact.departmentId }, order: [["isDefault", "DESC"], ["id", "ASC"]] });
  if (!pipeline) throw new Error("This department has no pipeline yet. Ask the CRM administrator to set one up.");
  const firstStage = await PipelineStage.findOne({ where: { pipelineId: pipeline.id, isWon: false, isLost: false }, order: [["order", "ASC"]] });
  if (!firstStage) throw new Error("The pipeline has no open stage.");

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const name = String(payload.name || "").trim() || `${contact.Company?.name || fullName} - ${payload.trainingType || "Training"}`;
  const deal = await createDeal(user, {
    name,
    stageId: firstStage.id,
    companyId: contact.companyId,
    contactId: contact.id,
    value: Number(payload.value) || 0,
    expectedCloseDate: payload.expectedCloseDate || null,
    source: contact.source || "Other",
    trainingType: payload.trainingType || null,
    ownerId: payload.ownerId || contact.ownerId || user.id,
    programId: payload.programId || null,
    batchId: payload.batchId || null,
  });

  const progressed = ["New", "Engaged", "Interested"].includes(contact.status);
  await contact.update({
    ...(progressed ? { status: "Qualified" } : {}),
    ...(contact.contactType === "Lead" ? { contactType: "Prospect" } : {}),
  });
  await Activity.create({ type: "status_change", title: "Lead converted to opportunity", description: `${name} (${deal.referenceNumber})`, contactId: contact.id, dealId: deal.id, companyId: contact.companyId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Converted ${fullName} to opportunity ${deal.referenceNumber}`, module: "deals", resourceType: "Deal", resourceId: deal.id, departmentId: contact.departmentId });
  return deal;
}

/** Links (or unlinks) the catalogue program / batch an inquiry is about. */
export async function setDealProgram(user, id, { programId, batchId }) {
  requirePermission(user, "deals.update");
  const deal = await Deal.findByPk(id, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);
  const link = await validateProgramLink(deal.departmentId, programId || null, batchId || null);
  await deal.update({ programId: link.programId, batchId: link.batchId, lastActivityAt: new Date() });
  await recordAudit({ userId: user.id, action: "Linked deal to a program", module: "deals", resourceType: "Deal", resourceId: id, departmentId: deal.departmentId });
  return deal;
}

export async function updateDeal(user, id, payload) {
  requirePermission(user, "deals.update");
  const deal = await Deal.findByPk(id, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);

  await deal.update({
    name: payload.name ?? deal.name,
    value: payload.value ?? deal.value,
    expectedCloseDate: payload.expectedCloseDate ?? deal.expectedCloseDate,
    ownerId: payload.ownerId ?? deal.ownerId,
    trainingType: payload.trainingType ?? deal.trainingType,
    lastActivityAt: new Date(),
  });
  await recordAudit({ userId: user.id, action: "Updated deal", module: "deals", resourceType: "Deal", resourceId: id });
  return deal;
}
