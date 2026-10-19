import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Note, Contact, Company, Deal, Department, User, Activity } = db;

// One place that knows how a note attaches to each kind of record: which
// permission may add / read it and which column carries the link.
const TARGETS = {
  contact: { model: Contact, field: "contactId", view: "contacts.view", write: "contacts.update" },
  company: { model: Company, field: "companyId", view: "companies.view", write: "companies.update" },
  deal: { model: Deal, field: "dealId", view: "deals.view", write: "deals.update" },
};

const MAX_LENGTH = 5000;

async function loadTarget(user, relatedType, relatedId, permission) {
  const target = TARGETS[relatedType];
  if (!target) throw new Error("Notes can only be added to a contact, company or deal.");
  requirePermission(user, target[permission]);
  const record = await target.model.findByPk(relatedId);
  if (!record) throw new Error("Record not found.");
  const dept = await Department.findByPk(record.departmentId);
  requireDepartmentAccess(user, dept?.key);
  return { target, record };
}

/** Notes on one record, newest first, with the author's name. */
export async function listNotes(user, relatedType, relatedId) {
  const { target } = await loadTarget(user, relatedType, relatedId, "view");
  return Note.findAll({
    where: { [target.field]: relatedId },
    include: [{ model: User, as: "author", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });
}

export async function addNote(user, { relatedType, relatedId, body }) {
  const { target, record } = await loadTarget(user, relatedType, relatedId, "write");
  const text = String(body || "").trim();
  if (!text) throw new Error("Write something before saving the note.");
  if (text.length > MAX_LENGTH) throw new Error(`A note can be at most ${MAX_LENGTH} characters.`);

  const note = await Note.create({
    body: text,
    [target.field]: record.id,
    // A note on a deal also belongs to the deal's company and contact timeline.
    companyId: relatedType === "deal" ? record.companyId : relatedType === "company" ? record.id : undefined,
    authorId: user.id,
  });

  await Activity.create({
    type: "note",
    title: "Note added",
    description: text.length > 300 ? `${text.slice(0, 300)}...` : text,
    contactId: relatedType === "contact" ? record.id : relatedType === "deal" ? record.contactId : null,
    companyId: relatedType === "company" ? record.id : relatedType === "deal" ? record.companyId : record.companyId || null,
    dealId: relatedType === "deal" ? record.id : null,
    userId: user.id,
    occurredAt: new Date(),
  });
  await recordAudit({ userId: user.id, action: "Added note", module: relatedType === "contact" ? "contacts" : `${relatedType}s`, resourceType: "Note", resourceId: note.id, departmentId: record.departmentId });
  return note;
}

/** Authors can delete their own notes; users who can edit the record can delete any. */
export async function deleteNote(user, noteId) {
  const note = await Note.findByPk(noteId);
  if (!note) throw new Error("Note not found.");
  const relatedType = note.dealId ? "deal" : note.contactId ? "contact" : "company";
  const field = TARGETS[relatedType].field;
  const { record } = await loadTarget(user, relatedType, note[field], "write");
  await note.destroy();
  await recordAudit({ userId: user.id, action: "Deleted note", module: `${relatedType}s`, resourceType: "Note", resourceId: noteId, departmentId: record.departmentId });
}
