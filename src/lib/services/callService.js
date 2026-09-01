import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Contact, Company, Deal, Department, Activity } = db;

const OUTCOMES = ["Connected", "No Answer", "Voicemail Left", "Follow-up Needed", "Wrong Number"];

/**
 * Logs a phone call as a real, timestamped record on the activity timeline
 * (requirements: "record client queries...received through different
 * communication channels including Telephone calls" / "communication
 * history"). This is the one channel that had no logging mechanism at all
 * before - WhatsApp and (simulated) email already did.
 */
export async function logCall(user, { contactId, companyId, dealId, direction, outcome, durationMinutes, notes }) {
  let departmentKey = user.department?.key;
  let entity = null;

  if (contactId) {
    requirePermission(user, "contacts.update");
    entity = await Contact.findByPk(contactId, { include: [Department] });
  } else if (dealId) {
    requirePermission(user, "deals.update");
    entity = await Deal.findByPk(dealId, { include: [Department] });
  } else if (companyId) {
    requirePermission(user, "companies.update");
    entity = await Company.findByPk(companyId, { include: [Department] });
  }
  if (!entity) throw new Error("A contact, deal or company is required to log a call against.");
  departmentKey = entity.Department?.key || departmentKey;
  requireDepartmentAccess(user, departmentKey);

  const resolvedOutcome = OUTCOMES.includes(outcome) ? outcome : "Connected";
  const activity = await Activity.create({
    type: "call",
    title: `${direction === "outbound" ? "Outbound" : "Inbound"} call - ${resolvedOutcome}`,
    description: notes || null,
    contactId: contactId || null,
    companyId: companyId || null,
    dealId: dealId || null,
    userId: user.id,
    metadata: { direction, outcome: resolvedOutcome, durationMinutes: durationMinutes || null },
    occurredAt: new Date(),
  });

  if (contactId) {
    await Contact.update({ lastActivityAt: new Date() }, { where: { id: contactId } });
  }
  if (dealId) {
    await Deal.update({ lastActivityAt: new Date() }, { where: { id: dealId } });
  }
  if (companyId) {
    await Company.update({ lastActivityAt: new Date() }, { where: { id: companyId } });
  }

  await recordAudit({ userId: user.id, action: `Logged ${direction} call (${resolvedOutcome})`, module: "activities", resourceType: "Activity", resourceId: activity.id });
  return activity;
}

export { OUTCOMES };
