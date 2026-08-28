import "server-only";
import db from "@/lib/db";

const { Setting, Contact, Activity } = db;

const DEFAULT_RULES = [
  { event: "Email opened", points: 5 },
  { event: "Email clicked", points: 10 },
  { event: "Website visit", points: 8 },
  { event: "Form submission", points: 15 },
  { event: "WhatsApp reply", points: 20 },
  { event: "Meeting attended", points: 25 },
];
const DEFAULT_THRESHOLD = 70;

/** Lead scoring rules, configurable in Settings (requirements #80). */
export async function getScoringRules() {
  const row = await Setting.findOne({ where: { category: "lead_scoring", key: "rules" } });
  return row?.value || DEFAULT_RULES;
}

export async function getQualifiedThreshold() {
  const row = await Setting.findOne({ where: { category: "lead_scoring", key: "qualified_threshold" } });
  return row?.value ?? DEFAULT_THRESHOLD;
}

/**
 * Applies one scoring event to a contact: adds the configured points,
 * clamps to [0, 100], auto-promotes status to Qualified when the
 * threshold is crossed, and logs both to the activity timeline.
 */
export async function applyScoreEvent(contact, eventName, actorUserId = null) {
  const rules = await getScoringRules();
  const rule = rules.find((r) => r.event === eventName);
  const points = rule?.points || 0;
  if (points === 0) return contact;

  const threshold = await getQualifiedThreshold();
  const previousScore = contact.leadScore;
  const nextScore = Math.max(0, Math.min(100, previousScore + points));
  const crossedThreshold = previousScore < threshold && nextScore >= threshold;

  await contact.update({
    leadScore: nextScore,
    status: crossedThreshold && contact.status !== "Converted" ? "Qualified" : contact.status,
    lastActivityAt: new Date(),
  });

  await Activity.create({
    type: "lead_score",
    title: `Lead score increased from ${previousScore} to ${nextScore}`,
    description: eventName,
    contactId: contact.id,
    userId: actorUserId,
    occurredAt: new Date(),
  });

  return contact;
}
