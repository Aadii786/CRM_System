import "server-only";
import { Op, literal } from "sequelize";
import db from "@/lib/db";
import { getWhatsAppProvider, normalizePhone, whatsappProviderName, WhatsAppNotConfiguredError } from "@/lib/whatsapp/provider";
import { applyScoreEvent } from "./leadScoringService";
import { createNotification } from "./notificationService";
import { fireTrigger } from "./automationEngine";

const { Contact, Conversation, Message, Activity, Campaign, CampaignRecipient, CampaignEvent } = db;

/**
 * WhatsApp (IKL Sprint 3): one conversation per person, outbound messages (staff replies, campaigns,
 * automations) go through the provider driver, inbound replies and delivery receipts arrive at
 * /api/whatsapp/webhook and land in the shared inbox + the person's history.
 */

export function contactNumber(contact) {
  return normalizePhone(contact.whatsappNumber) || normalizePhone(contact.phone);
}

/** Who may NOT be messaged: no valid number, unsubscribed, bounced or opted out. */
export const WHATSAPP_ELIGIBLE = [
  { [Op.or]: [{ whatsappNumber: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] } }, { phone: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] } }] },
  { status: { [Op.notIn]: ["Unsubscribed", "Bounced"] } },
  { optIn: { [Op.ne]: "Opted Out" } },
];

function fill(text, contact, companyName = "") {
  const values = { firstName: contact.firstName || "", lastName: contact.lastName || "", fullName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(), company: companyName || "" };
  return String(text || "").replace(/\{\{\s*(firstName|lastName|fullName|company)\s*\}\}/g, (_, k) => values[k]);
}
export { fill as fillWhatsappText };

async function conversationFor(contact, userId = null) {
  let conversation = await Conversation.findOne({ where: { contactId: contact.id } });
  if (!conversation) {
    conversation = await Conversation.create({
      contactId: contact.id, channel: "whatsapp", status: userId || contact.ownerId ? "assigned" : "open",
      assignedTo: userId || contact.ownerId || null, departmentId: contact.departmentId, lastMessageAt: new Date(), lastMessagePreview: "", unreadCount: 0,
    });
  }
  return conversation;
}

/**
 * Sends one WhatsApp message to a contact through the provider and records it in their conversation.
 * Returns { ok, error?, simulated? }. Never throws for a single failed message.
 */
export async function sendWhatsappToContact(contact, text, { userId = null, campaignId = null, template = null, companyName = "" } = {}) {
  const to = contactNumber(contact);
  if (!to) return { ok: false, error: "This person has no valid WhatsApp or phone number." };
  const body = fill(text, contact, companyName).trim();
  if (!body) return { ok: false, error: "The message is empty." };

  let result;
  const driver = getWhatsAppProvider();
  try {
    result = await driver.send({ to, text: body, template: template || undefined, language: "en", metadata: { contactId: contact.id, campaignId } });
  } catch (err) {
    if (err instanceof WhatsAppNotConfiguredError) return { ok: false, error: err.message, notConfigured: true };
    result = { ok: false, error: String(err.message || err).slice(0, 250) };
  }

  const conversation = await conversationFor(contact, userId);
  await Message.create({
    conversationId: conversation.id, direction: "outbound", senderType: userId ? "user" : "system", senderId: userId,
    body, status: result.ok ? (result.status === "delivered" ? "delivered" : "sent") : "failed",
    providerMessageId: result.providerMessageId || null, campaignId, sentAt: new Date(),
  });
  await conversation.update({ lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 120), status: conversation.status === "closed" ? "assigned" : conversation.status });
  if (result.ok) {
    await Activity.create({ type: "whatsapp", title: "WhatsApp message sent", description: body, contactId: contact.id, userId, occurredAt: new Date() });
  }
  return { ...result, simulated: driver.simulated, conversationId: conversation.id };
}

/**
 * Campaign sending, many recipients at once. The provider is called per person (that is the slow part
 * with a real service) but every database write for the batch is done in a few bulk statements, so a
 * campaign to thousands of people does not spend its time on bookkeeping.
 * recipients: CampaignRecipient rows loaded with Contact (+ Company). Stops at `deadline` and leaves
 * the rest queued. Returns { sent, failed, processed, notConfigured? }.
 */
export async function sendCampaignBatch(campaign, recipients, { deadline = Infinity } = {}) {
  const driver = getWhatsAppProvider();
  const now = new Date();
  const withContact = recipients.filter((r) => r.Contact);
  const convs = await Conversation.findAll({ where: { contactId: { [Op.in]: withContact.map((r) => r.Contact.id) } } });
  const convBy = new Map(convs.map((c) => [String(c.contactId), c]));

  const outcomes = [];
  let notConfigured = null;
  for (const r of recipients) {
    if (Date.now() > deadline) break;
    const contact = r.Contact;
    if (!contact) {
      outcomes.push({ r, ok: false, error: "Contact no longer exists" });
      continue;
    }
    const to = contactNumber(contact);
    if (!to) {
      outcomes.push({ r, ok: false, error: "This person has no valid WhatsApp or phone number." });
      continue;
    }
    const body = fill(campaign.messageBody, contact, contact.Company?.name || "").trim();
    try {
      const res = await driver.send({ to, text: body, template: campaign.templateName || undefined, language: "en", metadata: { contactId: contact.id, campaignId: campaign.id } });
      outcomes.push({ r, contact, body, ok: Boolean(res.ok), status: res.status, providerMessageId: res.providerMessageId || null, error: res.ok ? null : res.error || "Not sent" });
    } catch (err) {
      if (err instanceof WhatsAppNotConfiguredError) {
        notConfigured = err.message;
        break;
      }
      outcomes.push({ r, contact, body, ok: false, error: String(err.message || err).slice(0, 250) });
    }
  }

  // Conversations that do not exist yet (first message to this person).
  const missing = outcomes.filter((o) => o.contact && !convBy.has(String(o.contact.id)));
  if (missing.length) {
    await Conversation.bulkCreate(
      missing.map((o) => ({ contactId: o.contact.id, channel: "whatsapp", status: o.contact.ownerId ? "assigned" : "open", assignedTo: o.contact.ownerId || null, departmentId: o.contact.departmentId, lastMessageAt: now, lastMessagePreview: "", unreadCount: 0 })),
      { ignoreDuplicates: true }
    );
    const fresh = await Conversation.findAll({ where: { contactId: { [Op.in]: missing.map((o) => o.contact.id) } } });
    for (const c of fresh) convBy.set(String(c.contactId), c);
  }

  const sentOutcomes = outcomes.filter((o) => o.ok);
  const messageRows = [];
  const conversationRows = [];
  const activityRows = [];
  for (const o of outcomes.filter((x) => x.contact && x.body)) {
    const conv = convBy.get(String(o.contact.id));
    if (!conv) continue;
    messageRows.push({
      conversationId: conv.id, direction: "outbound", senderType: "system", senderId: null, body: o.body,
      status: o.ok ? (o.status === "delivered" ? "delivered" : "sent") : "failed", providerMessageId: o.providerMessageId, campaignId: campaign.id, sentAt: now,
    });
    if (o.ok) {
      conversationRows.push({ ...conv.get({ plain: true }), lastMessageAt: now, lastMessagePreview: o.body.slice(0, 120), status: conv.status === "closed" ? "assigned" : conv.status });
      activityRows.push({ type: "whatsapp", title: "WhatsApp message sent", description: o.body, contactId: o.contact.id, userId: null, occurredAt: now });
    }
  }
  if (messageRows.length) await Message.bulkCreate(messageRows);
  if (conversationRows.length) await Conversation.bulkCreate(conversationRows, { updateOnDuplicate: ["lastMessageAt", "lastMessagePreview", "status"] });
  if (activityRows.length) await Activity.bulkCreate(activityRows);

  const recipientRows = outcomes.map((o) => ({
    id: o.r.id, campaignId: o.r.campaignId, contactId: o.r.contactId,
    status: o.ok ? (o.status === "delivered" ? "delivered" : "sent") : "failed",
    providerMessageId: o.providerMessageId || null, sentAt: o.ok ? now : null, lastEventAt: now, error: o.ok ? null : String(o.error || "Not sent").slice(0, 250),
  }));
  if (recipientRows.length) {
    await CampaignRecipient.bulkCreate(recipientRows, { updateOnDuplicate: ["status", "providerMessageId", "sentAt", "lastEventAt", "error"] });
  }
  const eventRows = [];
  for (const o of sentOutcomes) {
    eventRows.push({ campaignId: campaign.id, contactId: o.contact.id, type: "sent", occurredAt: now });
    if (o.status === "delivered") eventRows.push({ campaignId: campaign.id, contactId: o.contact.id, type: "delivered", occurredAt: now });
  }
  if (eventRows.length) await CampaignEvent.bulkCreate(eventRows);

  return { sent: sentOutcomes.length, failed: outcomes.length - sentOutcomes.length, processed: outcomes.length, notConfigured };
}

/** Matches a sender's number to a contact (last 10 digits, ignoring spaces, dashes and +). */
async function findContactByNumber(digits) {
  const tail = digits.slice(-10);
  const strip = (c) => `REPLACE(REPLACE(REPLACE(REPLACE(\`Contact\`.\`${c}\`, ' ', ''), '-', ''), '+', ''), '(', '')`;
  return Contact.findOne({
    where: { [Op.or]: [literal(`${strip("whatsapp_number")} LIKE '%${tail}'`), literal(`${strip("phone")} LIKE '%${tail}'`)] },
    order: [["lastActivityAt", "DESC"]],
  });
}

/**
 * Inbound reply from a contact. Lands in the shared inbox, on the contact's history, scores the lead,
 * counts as a reply for the WhatsApp campaign they last received, and can start an automation.
 */
export async function handleInboundMessage({ from, text, providerMessageId = null, occurredAt = new Date() }) {
  const digits = normalizePhone(from);
  if (!digits) return { ignored: "invalid number" };
  const body = String(text || "").trim();
  if (!body) return { ignored: "empty message" };
  if (providerMessageId && (await Message.findOne({ where: { providerMessageId, direction: "inbound" } }))) return { ignored: "duplicate" };
  const contact = await findContactByNumber(digits);
  if (!contact) return { ignored: "unknown number" };

  const conversation = await conversationFor(contact);
  await Message.create({ conversationId: conversation.id, direction: "inbound", senderType: "contact", body, status: "delivered", providerMessageId, sentAt: occurredAt });
  await conversation.update({ lastMessageAt: occurredAt, lastMessagePreview: body.slice(0, 120), status: "open", unreadCount: (conversation.unreadCount || 0) + 1 });
  await Activity.create({ type: "whatsapp", title: "WhatsApp reply received", description: body, contactId: contact.id, occurredAt });
  await contact.update({ lastActivityAt: occurredAt });
  await applyScoreEvent(contact, "WhatsApp reply");

  // A reply counts as engagement with the last WhatsApp campaign this person received.
  const lastRecipient = await CampaignRecipient.findOne({
    where: { contactId: contact.id, status: { [Op.in]: ["sent", "delivered", "opened", "clicked"] } },
    include: [{ model: Campaign, attributes: ["id", "channel"], where: { channel: "whatsapp" }, required: true }],
    order: [["sentAt", "DESC"]],
  });
  if (lastRecipient && lastRecipient.status !== "clicked") {
    await lastRecipient.update({ status: "clicked", lastEventAt: occurredAt });
    await CampaignEvent.create({ campaignId: lastRecipient.campaignId, contactId: contact.id, type: "clicked", occurredAt, metadata: { reply: true } });
    const { recomputeCounters } = await import("./emailDeliveryService");
    await recomputeCounters(lastRecipient.campaignId);
  }

  const notifyId = conversation.assignedTo || contact.ownerId;
  if (notifyId) {
    await createNotification({ userId: notifyId, type: "whatsapp_reply", title: "WhatsApp reply", body: `${contact.firstName} ${contact.lastName}: ${body.slice(0, 100)}`, link: "/conversations" });
  }
  await fireTrigger("whatsapp_response", contact, {});
  return { recorded: true, contactId: contact.id, conversationId: conversation.id };
}

/** Delivery receipts: status is sent | delivered | read | failed. */
export async function handleStatusUpdate({ providerMessageId, status, occurredAt = new Date() }) {
  if (!providerMessageId) return { ignored: "no id" };
  const map = { sent: "sent", delivered: "delivered", read: "read", failed: "failed" };
  const next = map[status];
  if (!next) return { ignored: "unknown status" };
  const message = await Message.findOne({ where: { providerMessageId, direction: "outbound" } });
  if (!message) return { ignored: "unknown message" };
  const rank = { sent: 1, delivered: 2, read: 3, failed: 0 };
  if (next !== "failed" && (rank[next] || 0) <= (rank[message.status] || 0)) return { ignored: "no change" };
  await message.update({ status: next });

  if (message.campaignId) {
    const recipient = await CampaignRecipient.findOne({ where: { campaignId: message.campaignId, providerMessageId } });
    if (recipient) {
      const { recordEmailEvent } = await import("./emailDeliveryService");
      if (next === "delivered") await recordEmailEvent({ campaignId: message.campaignId, contactId: recipient.contactId, type: "delivered", occurredAt });
      if (next === "read") await recordEmailEvent({ campaignId: message.campaignId, contactId: recipient.contactId, type: "opened", occurredAt });
      if (next === "failed") await recipient.update({ status: "failed", error: "The WhatsApp service reported a failed delivery." });
    }
  }
  return { recorded: true };
}

export { whatsappProviderName };
