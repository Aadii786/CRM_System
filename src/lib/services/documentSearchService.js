import "server-only";
import { QueryTypes, Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, hasPermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";
import { readFile } from "./fileStorage";
import { extractText } from "@/lib/documents/textExtract";
import { recordAudit } from "./auditService";

// Document search (CRM-5.4, CRM-5.5): by file name, title, description and the text inside the file, narrowed by
// type, client, program and upload date. Only documents of records the person may see are returned.

const VIEW_PERMISSION = { contact: "contacts.view", company: "companies.view", deal: "deals.view", meeting: "meetings.view" };

const TYPE_PATTERNS = {
  pdf: [".pdf"], word: [".doc", ".docx"], excel: [".xls", ".xlsx", ".csv"], powerpoint: [".ppt", ".pptx"], image: [".png", ".jpg", ".jpeg"], text: [".txt"],
};
export const DOCUMENT_TYPES = [
  { value: "pdf", label: "PDF" }, { value: "word", label: "Word" }, { value: "excel", label: "Excel / CSV" },
  { value: "powerpoint", label: "PowerPoint" }, { value: "image", label: "Image" }, { value: "text", label: "Text" },
];

const likeEscape = (v) => String(v).replace(/[\\%_]/g, (m) => `\\${m}`);

async function visibleDepartmentIds(user) {
  const ids = await departmentIdsForKeys(getAccessibleDepartmentKeys(user, await allDepartmentKeys()));
  return ids.length ? ids : [0];
}

/** scope: "all" (names and content), "names" or "content". */
export async function searchDocuments(user, { q = "", scope = "all", type = "", companyId = "", programId = "", from = null, to = null, page = 1, limit = 25 } = {}) {
  const types = Object.keys(VIEW_PERMISSION).filter((t) => hasPermission(user, VIEW_PERMISSION[t]));
  if (!types.length) requirePermission(user, "contacts.view");
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
  const pageNo = Math.max(1, Number(page) || 1);
  const rep = { types, depts: await visibleDepartmentIds(user), limit: pageSize, offset: (pageNo - 1) * pageSize };

  const where = [];
  const text = String(q || "").trim().slice(0, 200);
  if (text) {
    rep.like = `%${likeEscape(text)}%`;
    rep.raw = text;
    if (scope === "names") where.push("(x.name LIKE :like OR x.title LIKE :like OR x.description LIKE :like)");
    else if (scope === "content") where.push("x.content_text LIKE :like");
    else where.push("(x.name LIKE :like OR x.title LIKE :like OR x.description LIKE :like OR x.content_text LIKE :like)");
  }
  if (type && TYPE_PATTERNS[type]) {
    where.push("(" + TYPE_PATTERNS[type].map((e, i) => { rep[`ext${i}`] = `%${e}`; return `x.name LIKE :ext${i}`; }).join(" OR ") + ")");
  }
  if (companyId) { where.push("x.company_id = :companyId"); rep.companyId = Number(companyId); }
  if (programId) { where.push("x.program_id = :programId"); rep.programId = Number(programId); }
  if (from) { where.push("x.created_at >= :from"); rep.from = from; }
  if (to) { where.push("x.created_at <= :to"); rep.to = to; }

  const base = `
    SELECT d.id, d.name, d.title, d.description, d.file_size, d.related_type, d.related_id, d.created_at, d.content_status, d.content_text,
           u.name AS uploader,
           CASE d.related_type WHEN 'company' THEN d.related_id WHEN 'contact' THEN ct.company_id WHEN 'deal' THEN dl.company_id WHEN 'meeting' THEN mt.company_id END AS company_id,
           CASE d.related_type WHEN 'deal' THEN dl.program_id END AS program_id,
           CASE d.related_type WHEN 'contact' THEN TRIM(CONCAT(ct.first_name, ' ', COALESCE(ct.last_name, ''))) WHEN 'deal' THEN dl.name WHEN 'meeting' THEN mt.title WHEN 'company' THEN cc.name END AS related_label
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      LEFT JOIN contacts ct ON d.related_type = 'contact' AND ct.id = d.related_id
      LEFT JOIN deals dl ON d.related_type = 'deal' AND dl.id = d.related_id
      LEFT JOIN meetings mt ON d.related_type = 'meeting' AND mt.id = d.related_id
      LEFT JOIN companies cc ON d.related_type = 'company' AND cc.id = d.related_id
     WHERE d.department_id IN (:depts) AND d.related_type IN (:types)`;
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const snippet = text && scope !== "names"
    ? "CASE WHEN LOCATE(:raw, x.content_text) > 0 THEN SUBSTRING(x.content_text, GREATEST(LOCATE(:raw, x.content_text) - 90, 1), 240) END"
    : "NULL";

  const [rows, count] = await Promise.all([
    db.sequelize.query(
      `SELECT x.id, x.name, x.title, x.description, x.file_size AS fileSize, x.related_type AS relatedType, x.related_id AS relatedId, x.created_at AS createdAt,
              x.content_status AS contentStatus, x.uploader, x.company_id AS companyId, co.name AS companyName, x.program_id AS programId, pr.title AS programTitle,
              x.related_label AS relatedLabel, ${snippet} AS snippet
         FROM (${base}) x LEFT JOIN companies co ON co.id = x.company_id LEFT JOIN programs pr ON pr.id = x.program_id
         ${whereSql}
        ORDER BY x.created_at DESC LIMIT :limit OFFSET :offset`, { replacements: rep, type: QueryTypes.SELECT }),
    db.sequelize.query(`SELECT COUNT(*) AS n FROM (${base}) x ${whereSql}`, { replacements: rep, type: QueryTypes.SELECT }),
  ]);
  return { rows, total: Number(count[0]?.n || 0), page: pageNo, limit: pageSize };
}

/** Companies and programs for the search filters. */
export async function documentFilterOptions(user) {
  const depts = await visibleDepartmentIds(user);
  const [companies, programs] = await Promise.all([
    db.Company.findAll({ where: { departmentId: { [Op.in]: depts } }, attributes: ["id", "name"], order: [["name", "ASC"]], limit: 500, raw: true }),
    db.Program.findAll({ where: { departmentId: { [Op.in]: depts } }, attributes: ["id", "title"], order: [["title", "ASC"]], limit: 300, raw: true }),
  ]);
  return { companies, programs };
}

/** How many visible documents have their text read, and how many are still waiting. */
export async function documentIndexStatus(user) {
  const depts = await visibleDepartmentIds(user);
  const rows = await db.Document.findAll({ where: { departmentId: { [Op.in]: depts } }, attributes: ["contentStatus", [db.Sequelize.fn("COUNT", db.Sequelize.col("id")), "n"]], group: ["contentStatus"], raw: true });
  const out = { total: 0, waiting: 0, indexed: 0, empty: 0, unsupported: 0, failed: 0 };
  for (const r of rows) { const n = Number(r.n); out.total += n; if (r.contentStatus === null) out.waiting += n; else out[r.contentStatus] = (out[r.contentStatus] || 0) + n; }
  return out;
}

/** Reads the text of documents that have not been read yet (for example files uploaded before Sprint 4). */
export async function reindexDocuments(user, { all = false } = {}) {
  requirePermission(user, "contacts.update");
  const depts = await visibleDepartmentIds(user);
  const docs = await db.Document.findAll({ where: { departmentId: { [Op.in]: depts }, ...(all ? {} : { contentStatus: null }) }, limit: 500 });
  const result = { checked: docs.length, indexed: 0, empty: 0, unsupported: 0, failed: 0, missing: 0 };
  for (const doc of docs) {
    try {
      const buffer = await readFile(doc.storedFileName);
      const { text, status } = extractText(buffer, doc.name);
      await doc.update({ contentText: text || null, contentStatus: status, indexedAt: new Date() });
      result[status] += 1;
    } catch {
      result.missing += 1; // the file is no longer on disk
      await doc.update({ contentStatus: "failed", indexedAt: new Date() });
    }
  }
  await recordAudit({ userId: user.id, action: `Read the text of ${result.checked} documents for search`, module: "documents", resourceType: "Document" });
  return result;
}
