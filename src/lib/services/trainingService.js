import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { TrainingProgram, Participant, Deal, Department, Contact, Trainer, Activity } = db;

/**
 * Client-specific (in-house) training engagements on a deal, and the people
 * who attend them. A participant is always linked to the person's master
 * contact record (one record per person across lead / participant / alumnus):
 * the contact is matched by email or created.
 */

const TRAINING_TYPES = ["ODC", "OB", "OEP", "CP", "Consultancy"];
const ENGAGEMENT_STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function loadDeal(user, dealId) {
  const deal = await Deal.findByPk(dealId, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);
  return deal;
}

async function loadEngagement(user, id) {
  requirePermission(user, "training.manage");
  const engagement = await TrainingProgram.findByPk(id);
  if (!engagement) throw new Error("Training engagement not found.");
  if (!engagement.dealId) throw new Error("This engagement is not linked to a deal.");
  const deal = await loadDeal(user, engagement.dealId);
  return { engagement, deal };
}

function dateOrNull(value, label) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!DATE_RE.test(s)) throw new Error(`Enter a valid ${label}.`);
  return s;
}

function fields(payload, existing = {}, deal = null) {
  const title = String(payload.title ?? existing.title ?? "").trim();
  if (!title) throw new Error("Give the engagement a title.");
  const trainingType = payload.trainingType || existing.trainingType || deal?.trainingType;
  if (!TRAINING_TYPES.includes(trainingType)) throw new Error("Pick the training type.");
  const status = payload.status || existing.status || "Planned";
  if (!ENGAGEMENT_STATUSES.includes(status)) throw new Error("Pick a status from the list.");
  const startDate = payload.startDate !== undefined ? dateOrNull(payload.startDate, "start date") : existing.startDate ?? null;
  const endDate = payload.endDate !== undefined ? dateOrNull(payload.endDate, "end date") : existing.endDate ?? null;
  if (startDate && endDate && endDate < startDate) throw new Error("The end date cannot be before the start date.");
  const cost = payload.cost !== undefined && payload.cost !== "" ? Number(payload.cost) : Number(existing.cost || 0);
  if (!Number.isFinite(cost) || cost < 0) throw new Error("The fee must be zero or more.");
  const trainerId = payload.trainerId !== undefined ? (payload.trainerId ? Number(payload.trainerId) : null) : existing.trainerId ?? null;
  return {
    title, trainingType, status, startDate, endDate, cost, trainerId,
    location: payload.location !== undefined ? String(payload.location || "").trim() || null : existing.location ?? null,
  };
}

export async function createEngagement(user, dealId, payload) {
  requirePermission(user, "training.manage");
  const deal = await loadDeal(user, dealId);
  const f = fields(payload, {}, deal);
  if (f.trainerId && !(await Trainer.findByPk(f.trainerId))) throw new Error("That trainer does not exist.");
  const engagement = await TrainingProgram.create({ ...f, dealId: deal.id, companyId: deal.companyId, participantsCount: 0 });
  await Activity.create({ type: "system", title: `Training engagement added: ${f.title}`, dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Added training engagement "${f.title}"`, module: "deals", resourceType: "TrainingProgram", resourceId: engagement.id, departmentId: deal.departmentId });
  return engagement;
}

export async function updateEngagement(user, id, payload) {
  const { engagement, deal } = await loadEngagement(user, id);
  const f = fields(payload, engagement.get({ plain: true }), deal);
  if (f.trainerId && !(await Trainer.findByPk(f.trainerId))) throw new Error("That trainer does not exist.");
  await engagement.update(f);
  await recordAudit({ userId: user.id, action: `Updated training engagement "${f.title}"`, module: "deals", resourceType: "TrainingProgram", resourceId: id, departmentId: deal.departmentId });
  return engagement;
}

export async function deleteEngagement(user, id) {
  const { engagement, deal } = await loadEngagement(user, id);
  const people = await Participant.count({ where: { trainingProgramId: id } });
  if (people) throw new Error("Remove the participants first, or mark the engagement Cancelled.");
  await engagement.destroy();
  await recordAudit({ userId: user.id, action: `Deleted training engagement "${engagement.title}"`, module: "deals", resourceType: "TrainingProgram", resourceId: id, departmentId: deal.departmentId });
}

async function refreshCount(trainingProgramId) {
  const n = await Participant.count({ where: { trainingProgramId } });
  await TrainingProgram.update({ participantsCount: n }, { where: { id: trainingProgramId } });
}

/** Finds the person by email in the department or creates a contact for them. */
async function matchOrCreateContact(user, deal, { name, email, designation, phone }) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !EMAIL_RE.test(clean)) throw new Error("Enter the participant's email so they stay one person across the CRM.");
  let contact = await Contact.findOne({ where: { departmentId: deal.departmentId, email: clean } });
  if (contact) return { contact, created: false };
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) throw new Error("Enter the participant's name.");
  contact = await Contact.create({
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
    email: clean,
    phone: phone || null,
    jobTitle: designation || null,
    companyId: deal.companyId || null,
    departmentId: deal.departmentId,
    ownerId: deal.ownerId || user.id,
    source: "Other",
    contactType: "Customer",
    status: "New",
    engagementStatus: "Inactive",
    leadScore: 0,
  });
  return { contact, created: true };
}

export async function addParticipant(user, engagementId, payload) {
  const { engagement, deal } = await loadEngagement(user, engagementId);
  const { contact, created } = await matchOrCreateContact(user, deal, payload);
  const already = await Participant.findOne({ where: { trainingProgramId: engagement.id, contactId: contact.id } });
  if (already) throw new Error(`${contact.firstName} ${contact.lastName} is already a participant.`);
  const participant = await Participant.create({
    trainingProgramId: engagement.id,
    contactId: contact.id,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
    designation: payload.designation?.trim() || contact.jobTitle || null,
    organization: payload.organization?.trim() || null,
    email: contact.email,
    phone: payload.phone?.trim() || contact.phone || null,
    attendance: "Registered",
  });
  await contact.update({ isParticipant: true, lastActivityAt: new Date() });
  await refreshCount(engagement.id);
  await Activity.create({ type: "system", title: `Added as participant: ${engagement.title}`, contactId: contact.id, dealId: deal.id, companyId: deal.companyId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Added participant ${participant.name} to "${engagement.title}"${created ? " (new contact)" : ""}`, module: "deals", resourceType: "Participant", resourceId: participant.id, departmentId: deal.departmentId });
  return { participant, createdContact: created };
}

export async function removeParticipant(user, participantId) {
  requirePermission(user, "training.manage");
  const participant = await Participant.findByPk(participantId);
  if (!participant) throw new Error("Participant not found.");
  const { engagement, deal } = await loadEngagement(user, participant.trainingProgramId);
  await participant.destroy();
  await refreshCount(engagement.id);
  if (participant.contactId) {
    const stillAttending = await Participant.count({ where: { contactId: participant.contactId } });
    if (!stillAttending) await Contact.update({ isParticipant: false }, { where: { id: participant.contactId, isAlumnus: false } });
  }
  await recordAudit({ userId: user.id, action: `Removed participant ${participant.name} from "${engagement.title}"`, module: "deals", resourceType: "Participant", resourceId: participantId, departmentId: deal.departmentId });
}

export { TRAINING_TYPES, ENGAGEMENT_STATUSES };
