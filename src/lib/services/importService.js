import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { Contact, Import, ImportRow } = db;

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
export async function runImport(user, { filename, departmentKey, rows }) {
  requirePermission(user, "contacts.import");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");

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

  if (toInsert.length > 0) {
    await Contact.bulkCreate(
      toInsert.map((v) => ({
        firstName: v.row.firstName,
        lastName: v.row.lastName || "",
        email: v.row.email,
        phone: v.row.phone || null,
        jobTitle: v.row.jobTitle || null,
        city: v.row.city || null,
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
  };

  await importRecord.update({ ...summary, status: "completed", completedAt: new Date() });
  await recordAudit({ userId: user.id, action: `Imported ${summary.importedRows} contacts from ${filename}`, module: "contacts", resourceType: "Import", resourceId: importRecord.id, departmentId: dept.id });

  return { importId: importRecord.id, ...summary };
}
