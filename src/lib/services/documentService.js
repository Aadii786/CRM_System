import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { saveFile, readFile, deleteFile } from "./fileStorage";
import { recordAudit } from "./auditService";

const { Document, Contact, Company, Deal, Meeting, Department, User } = db;

const ENTITY_MODEL = { contact: Contact, company: Company, deal: Deal, meeting: Meeting };
const VIEW_PERMISSION = { contact: "contacts.view", company: "companies.view", deal: "deals.view", meeting: "meetings.view" };
const MANAGE_PERMISSION = { contact: "contacts.update", company: "companies.update", deal: "deals.update", meeting: "meetings.update" };

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".png", ".jpg", ".jpeg", ".txt", ".csv",
]);

async function loadRelatedEntity(relatedType, relatedId) {
  const Model = ENTITY_MODEL[relatedType];
  if (!Model) throw new Error("Invalid document type.");
  const entity = await Model.findByPk(relatedId, { include: [Department] });
  if (!entity) throw new Error("Related record not found.");
  return entity;
}

export async function listDocuments(user, relatedType, relatedId) {
  requirePermission(user, VIEW_PERMISSION[relatedType]);
  const entity = await loadRelatedEntity(relatedType, relatedId);
  requireDepartmentAccess(user, entity.Department?.key);

  return Document.findAll({
    where: { relatedType, relatedId },
    include: [{ model: User, as: "uploader", attributes: ["id", "name", "avatarColor"] }],
    order: [["createdAt", "DESC"]],
  });
}

export async function uploadDocument(user, { relatedType, relatedId, file, description }) {
  requirePermission(user, MANAGE_PERMISSION[relatedType]);
  const entity = await loadRelatedEntity(relatedType, relatedId);
  requireDepartmentAccess(user, entity.Department?.key);

  if (!file || file.size === 0) throw new Error("No file selected.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File is too large (15MB limit).");

  const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, images, text, CSV.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storedFileName = await saveFile(buffer, file.name);

  const dept = entity.Department || (await departmentByKey(user.department?.key));

  const doc = await Document.create({
    name: file.name,
    description: description || null,
    storedFileName,
    mimeType: file.type || null,
    fileSize: file.size,
    relatedType,
    relatedId,
    departmentId: dept.id,
    uploadedBy: user.id,
  });

  await db.Activity.create({
    type: "note",
    title: `Document attached: ${file.name}`,
    contactId: relatedType === "contact" ? relatedId : null,
    companyId: relatedType === "company" ? relatedId : null,
    dealId: relatedType === "deal" ? relatedId : null,
    userId: user.id,
    occurredAt: new Date(),
  });

  await recordAudit({ userId: user.id, action: `Uploaded document "${file.name}"`, module: "documents", resourceType: "Document", resourceId: doc.id, departmentId: dept.id });
  return doc;
}

export async function getDocumentForDownload(user, id) {
  const doc = await Document.findByPk(id);
  if (!doc) throw new Error("Document not found.");
  requirePermission(user, VIEW_PERMISSION[doc.relatedType]);
  const entity = await loadRelatedEntity(doc.relatedType, doc.relatedId);
  requireDepartmentAccess(user, entity.Department?.key);

  const buffer = await readFile(doc.storedFileName);
  return { doc, buffer };
}

export async function deleteDocument(user, id) {
  const doc = await Document.findByPk(id);
  if (!doc) throw new Error("Document not found.");
  requirePermission(user, MANAGE_PERMISSION[doc.relatedType]);
  const entity = await loadRelatedEntity(doc.relatedType, doc.relatedId);
  requireDepartmentAccess(user, entity.Department?.key);

  await deleteFile(doc.storedFileName);
  await doc.destroy();
  await recordAudit({ userId: user.id, action: `Deleted document "${doc.name}"`, module: "documents", resourceType: "Document", resourceId: id });
}
