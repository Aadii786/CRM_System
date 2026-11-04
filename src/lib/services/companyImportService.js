import "server-only";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";
import { normalizeCompanyName, websiteHost } from "./companyService";
import { ORGANIZATION_TYPES, LEAD_SOURCES, COMPANY_SIZES } from "@/lib/constants/crm";

const { Company, Import, ImportRow } = db;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["Prospect", "Active", "Inactive"];

async function resolveDepartment(user, departmentKey) {
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) throw new Error("Invalid department.");
  if (!user.department?.isUniversityWide && user.department?.key !== dept.key) throw new Error("You cannot import into that department.");
  return dept;
}

/**
 * Sorts every row into valid / duplicate / invalid. A duplicate is a company
 * whose normalized name (ignoring Ltd, Pvt and punctuation) or website host is
 * already in the department, or repeated earlier in the same file.
 */
async function classify(dept, rows) {
  const existing = await Company.findAll({ where: { departmentId: dept.id }, attributes: ["id", "name", "website"] });
  const names = new Set(existing.map((c) => normalizeCompanyName(c.name)));
  const hosts = new Set(existing.map((c) => websiteHost(c.website)).filter(Boolean));

  return rows.map((row, idx) => {
    const name = String(row.name || "").trim();
    const rowNumber = idx + 1;
    if (!name) return { rowNumber, status: "invalid", errorMessage: "Missing company name", row };
    const norm = normalizeCompanyName(name);
    const host = websiteHost(row.website);
    if (!norm) return { rowNumber, status: "invalid", errorMessage: "Company name has no usable letters", row };
    if (names.has(norm) || (host && hosts.has(host))) {
      const inFile = !existing.some((c) => normalizeCompanyName(c.name) === norm) && !(host && existing.some((c) => websiteHost(c.website) === host));
      return { rowNumber, status: "duplicate", errorMessage: inFile ? "Repeated in this file" : "Already exists in the CRM", row };
    }
    names.add(norm);
    if (host) hosts.add(host);
    return { rowNumber, status: "valid", row: { ...row, name } };
  });
}

/** Counts for the wizard's "duplicate detection" step; nothing is written. */
export async function previewCompanyImport(user, { departmentKey, rows }) {
  requirePermission(user, "companies.create");
  const dept = await resolveDepartment(user, departmentKey);
  const classified = await classify(dept, rows);
  const count = (s) => classified.filter((c) => c.status === s).length;
  return {
    valid: count("valid"),
    duplicates: count("duplicate"),
    invalid: count("invalid"),
    sample: classified.filter((c) => c.status !== "valid").slice(0, 8).map((c) => ({ rowNumber: c.rowNumber, name: c.row.name || "", status: c.status, message: c.errorMessage })),
  };
}

export async function runCompanyImport(user, { filename, departmentKey, rows }) {
  requirePermission(user, "companies.create");
  const dept = await resolveDepartment(user, departmentKey);
  if (!Array.isArray(rows) || !rows.length) throw new Error("The file has no rows.");
  if (rows.length > 20000) throw new Error("Import at most 20,000 companies at a time.");

  const record = await Import.create({ filename, entity: "companies", uploadedBy: user.id, departmentId: dept.id, totalRows: rows.length, status: "importing", startedAt: new Date() });
  const classified = await classify(dept, rows);
  const toInsert = classified.filter((c) => c.status === "valid");

  if (toInsert.length) {
    await Company.bulkCreate(
      toInsert.map(({ row }) => ({
        name: row.name,
        organizationType: ORGANIZATION_TYPES.includes(row.organizationType) ? row.organizationType : "Corporate",
        industry: row.industry?.trim() || null,
        companySize: COMPANY_SIZES.includes(row.companySize) ? row.companySize : null,
        website: row.website?.trim() || null,
        phone: row.phone?.trim() || null,
        email: row.email && EMAIL_RE.test(row.email.trim()) ? row.email.trim() : null,
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        country: row.country?.trim() || "Pakistan",
        leadSource: LEAD_SOURCES.includes(row.leadSource) ? row.leadSource : "Other",
        status: STATUSES.includes(row.status) ? row.status : "Prospect",
        departmentId: dept.id,
        ownerId: user.id,
      })),
      { validate: false }
    );
  }

  const sample = classified.slice(0, 500).map((c) => ({ importId: record.id, rowNumber: c.rowNumber, data: c.row, status: c.status === "valid" ? "imported" : c.status, errorMessage: c.errorMessage || null }));
  if (sample.length) await ImportRow.bulkCreate(sample);

  const summary = {
    totalRows: rows.length,
    validRows: toInsert.length,
    duplicateRows: classified.filter((c) => c.status === "duplicate").length,
    invalidRows: classified.filter((c) => c.status === "invalid").length,
    importedRows: toInsert.length,
  };
  await record.update({ ...summary, status: "completed", completedAt: new Date() });
  await recordAudit({ userId: user.id, action: `Imported ${summary.importedRows} companies from ${filename}`, module: "companies", resourceType: "Import", resourceId: record.id, departmentId: dept.id });
  return { importId: record.id, ...summary };
}
