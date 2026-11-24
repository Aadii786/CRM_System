import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { departmentByKey } from "./departmentService";
import { recordAudit } from "./auditService";

const { Contact, Company, Deal, Department, Activity, User } = db;

/**
 * One-to-one emails on the timeline (MIR-4.4). Two ways in:
 *   1. staff log an email they sent or received (a form on the contact and the deal);
 *   2. "copy to the CRM": staff put a CRM mailbox in Bcc (or forward a received mail), the IT department routes
 *      that mailbox to POST /api/email/capture, and the message lands on the right person's timeline.
 * Either way it becomes an "email" activity with the direction, subject and the start of the text.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BODY_LIMIT = 4000;

export function addressesIn(value) {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.flatMap((v) => String(v || "").match(EMAIL_RE) || []).map((a) => a.toLowerCase()))];
}

function activityValues({ direction, subject, body, occurredAt, messageId, source, from, to }) {
  const sent = direction === "sent";
  const clean = String(subject || "").trim().slice(0, 200) || "(no subject)";
  return {
    type: "email",
    title: `Email ${sent ? "sent" : "received"}: ${clean}`,
    description: String(body || "").trim().slice(0, BODY_LIMIT) || null,
    occurredAt: occurredAt && !Number.isNaN(new Date(occurredAt).getTime()) ? new Date(occurredAt) : new Date(),
    metadata: { direction: sent ? "sent" : "received", subject: clean, messageId: messageId || null, source, from: from || null, to: to || null, oneToOne: true },
  };
}

async function alreadyLogged(contactId, messageId) {
  if (!messageId) return false;
  const rows = await Activity.findAll({ where: { contactId, type: "email" }, attributes: ["metadata"], order: [["occurredAt", "DESC"]], limit: 300, raw: true });
  return rows.some((r) => { const m = typeof r.metadata === "string" ? safeJson(r.metadata) : r.metadata; return m?.messageId === messageId; });
}
function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

/** Staff log an email by hand against a contact, a deal or a company. */
export async function logEmail(user, { contactId, dealId, companyId, direction = "sent", subject, body, occurredAt = null }) {
  let entity = null;
  if (contactId) { requirePermission(user, "contacts.update"); entity = await Contact.findByPk(contactId, { include: [Department] }); }
  else if (dealId) { requirePermission(user, "deals.update"); entity = await Deal.findByPk(dealId, { include: [Department] }); }
  else if (companyId) { requirePermission(user, "companies.update"); entity = await Company.findByPk(companyId, { include: [Department] }); }
  if (!entity) throw new Error("A contact, deal or company is required to log an email against.");
  requireDepartmentAccess(user, entity.Department?.key);
  if (!String(subject || "").trim()) throw new Error("Enter the subject of the email.");

  const dir = direction === "received" ? "received" : "sent";
  const activity = await Activity.create({
    ...activityValues({ direction: dir, subject, body, occurredAt, source: "manual" }),
    contactId: contactId || (dealId ? entity.contactId : null) || null,
    companyId: companyId || entity.companyId || null,
    dealId: dealId || null,
    userId: user.id,
  });
  const now = new Date();
  if (contactId || entity.contactId) await Contact.update({ lastActivityAt: now }, { where: { id: contactId || entity.contactId } });
  if (dealId) await Deal.update({ lastActivityAt: now }, { where: { id: dealId } });
  await recordAudit({ userId: user.id, action: `Logged an email ${dir}: ${String(subject).slice(0, 80)}`, module: "activities", resourceType: "Activity", resourceId: activity.id });
  return activity;
}

/**
 * A copied email arrives from the mail service. The department comes from the capture address the service
 * calls (departmentKey); the person is found by email among the senders and recipients. Mail between staff only,
 * or with nobody known, is ignored. The same message id is never recorded twice.
 */
export async function captureInboundEmail({ departmentKey, from, to, cc, subject, text, date, messageId, direction = null }) {
  const dept = await departmentByKey(departmentKey);
  if (!dept) throw Object.assign(new Error("Unknown department."), { status: 400 });
  const fromList = addressesIn(from), others = addressesIn([...(Array.isArray(to) ? to : [to]), ...(Array.isArray(cc) ? cc : [cc])]);
  const staffRows = await User.findAll({ where: { departmentId: dept.id }, attributes: ["email"], raw: true });
  const staff = new Set(staffRows.map((u) => u.email.toLowerCase()));
  const sentByStaff = direction ? direction === "sent" : fromList.some((a) => staff.has(a));
  const counterpart = (sentByStaff ? others : fromList).filter((a) => !staff.has(a));
  if (!counterpart.length) return { recorded: 0, ignored: "no customer address in the message" };

  const contacts = await Contact.findAll({ where: { departmentId: dept.id, email: counterpart } });
  let recorded = 0, duplicates = 0;
  for (const c of contacts) {
    if (await alreadyLogged(c.id, messageId)) { duplicates++; continue; }
    await Activity.create({
      ...activityValues({ direction: sentByStaff ? "sent" : "received", subject, body: text, occurredAt: date, messageId, source: "capture", from: fromList[0], to: others.join(", ").slice(0, 400) }),
      contactId: c.id, companyId: c.companyId || null, userId: null,
    });
    await c.update({ lastActivityAt: new Date() });
    recorded++;
  }
  return { recorded, duplicates, ignored: contacts.length ? null : "no matching contact" };
}
