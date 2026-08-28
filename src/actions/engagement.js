"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import db from "@/lib/db";
import { applyScoreEvent } from "@/lib/services/leadScoringService";
import { sendDemoWhatsappMessage, replyInConversation, simulateInboundReply, assignConversation } from "@/lib/services/conversationService";
import { recordAudit } from "@/lib/services/auditService";

const { Contact } = db;

/**
 * Simulated "Send Email" quick action (requirements #16/#61). Logs the
 * activity and applies the configured lead-scoring points for an email
 * open - this is a demo shortcut standing in for a real send+open event.
 */
export async function sendDemoEmailAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  const contact = await Contact.findByPk(contactId);
  if (!contact) throw new Error("Contact not found.");

  await db.Activity.create({
    type: "email",
    title: "Email sent (demo)",
    description: "A one-off demo email was sent from the contact profile.",
    contactId,
    userId: user.id,
    occurredAt: new Date(),
  });
  await contact.update({ engagementStatus: "Delivered", lastActivityAt: new Date() });
  await applyScoreEvent(contact, "Email opened", user.id);
  await recordAudit({ userId: user.id, action: "Sent demo email", module: "contacts", resourceType: "Contact", resourceId: contactId });

  revalidatePath(`/contacts/${contactId}`);
}

export async function sendDemoWhatsappAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  const body = formData.get("body") || "Hi! Following up on your interest in our programs - happy to answer any questions.";

  const conversation = await sendDemoWhatsappMessage(user, contactId, body);
  const contact = await Contact.findByPk(contactId);
  if (contact) await contact.update({ engagementStatus: "Engaged", lastActivityAt: new Date() });

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/conversations");
  return { conversationId: conversation.id };
}

export async function replyInConversationAction(formData) {
  const user = await requireUser();
  const conversationId = formData.get("conversationId");
  const body = formData.get("body");
  if (!body || !body.trim()) return;
  await replyInConversation(user, conversationId, body.trim());
  revalidatePath(`/conversations`);
}

/**
 * Operator-triggered stand-in for a WhatsApp webhook delivering an inbound
 * reply (requirements #27). Marking a contact Qualified from this reply is
 * exactly the "WhatsApp reply -> Auto-Qualify" automation seeded in the demo.
 */
export async function simulateInboundReplyAction(formData) {
  const user = await requireUser();
  const conversationId = formData.get("conversationId");
  const body = formData.get("body") || "Yes, I'm interested - please share more details.";
  const conversation = await simulateInboundReply(user, conversationId, body);

  const contact = await Contact.findByPk(conversation.contactId);
  if (contact) {
    await applyScoreEvent(contact, "WhatsApp reply", null);
    if (contact.status !== "Converted") await contact.update({ status: "Qualified", engagementStatus: "Engaged" });
  }

  revalidatePath("/conversations");
  revalidatePath(`/contacts/${conversation.contactId}`);
}

export async function assignConversationAction(formData) {
  const user = await requireUser();
  const conversationId = formData.get("conversationId");
  const assigneeId = formData.get("assigneeId");
  await assignConversation(user, conversationId, assigneeId);
  revalidatePath("/conversations");
}
