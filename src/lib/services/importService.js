import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { Contact, Import, ImportRow, ContactListMember, ContactList } = db;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function listImports(user, limit = 20) {
  requirePermission(user, "contacts.import");
  return Import.findAll({ order: [["createdAt", "DESC"]], limit });
}

/** Returns which of the given emails already exist in this department (case-insensitive). */
export async function findExistingEmails(departmentId, emails) {
  if (emails.length === 0) return new Set();
  const rows = await Contact.findAll({
    where: { departmentId, email: { [Op.in]: emails } },
    attributes: ["email"],
  });
  return new Set(rows.map((r) => r.email.toLowerCase()));
}

/**
 * Validates + de-duplicates + bulk-inserts mapped CSV rows (requirements
 * #17-#18). Uses Sequelize's bulkCreate rather than one INSERT per row so
 * imports stay fast even at thousands of rows.
 */
export async function runImport(user, { filename, departmentKey, rows, listId }) {
  requirePermission(user, "contacts.import");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");

  let targetList = null;
  if (listId) {
    targetList = await ContactList.findByPk(listId);
    if (!targetList || targetList.departmentId !== dept.id) targetList = null; // silently ignore a list outside this department rather than failing the whole import
  }

  const importRecord = await Import.create({
    filename,
    uploadedBy: user.id,
    departmentId: dept.id,
    totalRows: rows.length,
    fieldMapping: null,
    status: "importing",
    startedAt: new Date(),
  });

  const seenInFile = new Set();
  const validated = rows.map((row, idx) => {
    const email = (row.email || "").trim().toLowerCase();
    const firstName = (row.firstName || "").trim();
    const lastName = (row.lastName || "").trim();

    if (!email || !EMAIL_RE.test(email) || !firstName) {
      return { rowNumber: idx + 1, status: "invalid", errorMessage: !email ? "Missing email" : !EMAIL_RE.test(email) ? "Invalid email format" : "Missing first name", row };
    }
    if (seenInFile.has(email)) {
      return { rowNumber: idx + 1, status: "duplicate", errorMessage: "Duplicate within file", row };
    }
    seenInFile.add(email);
    return { rowNumber: idx + 1, status: "valid", row: { ...row, email } };
  });

  const validEmails = validated.filter((v) => v.status === "valid").map((v) => v.row.email);
  const existing = await findExistingEmails(dept.id, validEmails);

  const finalRows = validated.map((v) => {
    if (v.status === "valid" && existing.has(v.row.email)) {
      return { ...v, status: "duplicate", errorMessage: "Already exists in CRM" };
    }
    return v;
  });

  const toInsert = finalRows.filter((v) => v.status === "valid");
  let insertedContacts = [];

  if (toInsert.length > 0) {
    insertedContacts = await Contact.bulkCreate(
      toInsert.map((v) => ({
        firstName: v.row.firstName,
        lastName: v.row.lastName || "",
        email: v.row.email,
        phone: v.row.phone || null,
        whatsappNumber: v.row.whatsappNumber || null,
        landlineNumber: v.row.landlineNumber || null,
        externalId: v.row.externalId || null,
        linkedin: v.row.linkedin || null,
        timezone: v.row.timezone || null,
        detectedLanguage: v.row.detectedLanguage || null,
        doubleOptIn: v.row.doubleOptIn === "Yes" ? "Yes" : "No",
        optIn: ["Opted In", "Opted Out"].includes(v.row.optIn) ? v.row.optIn : "Unknown",
        contactType: ["Lead", "Prospect", "Customer", "Partner", "Other"].includes(v.row.contactType) ? v.row.contactType : "Lead",
        jobTitle: v.row.jobTitle || null,
        city: v.row.city || null,
        country: v.row.country || "Pakistan",
        source: v.row.source || "Other",
        departmentId: dept.id,
        ownerId: user.id,
        status: "New",
        engagementStatus: "Inactive",
        leadScore: 0,
      })),
      { validate: false }
    );
  }

  // Select a List (requirement, matching Brevo's import flow): every
  // successfully-imported contact is added to the chosen list in one bulk
  // insert, same pattern as the row insert above - no per-contact query
  // even at thousands of rows.
  if (targetList && insertedContacts.length > 0) {
    await ContactListMember.bulkCreate(
      insertedContacts.map((c) => ({ contactId: c.id, listId: targetList.id, addedAt: new Date() })),
      { validate: false }
    );
    await targetList.increment("contactCount", { by: insertedContacts.length });
  }

  // Persist a bounded sample of row-level results for the summary/history
  // screen - at 58k rows we don't need (or want) a million-row detail table.
  const sample = finalRows.slice(0, 500).map((v) => ({
    importId: importRecord.id,
    rowNumber: v.rowNumber,
    data: v.row,
    status: v.status === "valid" ? "imported" : v.status,
    errorMessage: v.errorMessage || null,
  }));
  if (sample.length > 0) await ImportRow.bulkCreate(sample);

  const summary = {
    totalRows: rows.length,
    validRows: finalRows.filter((v) => v.status === "valid").length,
    duplicateRows: finalRows.filter((v) => v.status === "duplicate").length,
    invalidRows: finalRows.filter((v) => v.status === "invalid").length,
    importedRows: toInsert.length,
    listName: targetList?.name || null,
  };

  await importRecord.update({ ...summary, status: "completed", completedAt: new Date() });
  await recordAudit({
    userId: user.id,
    action: `Imported ${summary.importedRows} contacts from ${filename}${targetList ? ` into list "${targetList.name}"` : ""}`,
    module: "contacts",
    resourceType: "Import",
    resourceId: importRecord.id,
    departmentId: dept.id,
  });

  return { importId: importRecord.id, ...summary };
}
