"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import db from "@/lib/db";
import { sendDemoWhatsappMessage, replyInConversation, simulateInboundReply, assignConversation } from "@/lib/services/conversationService";
import { recordAudit } from "@/lib/services/auditService";

const { Contact } = db;

/**
 * "Send Email" quick action on a contact: logs a one-off demo email on the timeline. It no longer
 * adds lead-score points: scoring now follows real opens, clicks, replies and meetings (CRM-2.2).
 */
export async function sendDemoEmailAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  requirePermission(user, "contacts.update");
  const contact = await Contact.findByPk(contactId, { include: [db.Department] });
  if (!contact) throw new Error("Contact not found.");
  requireDepartmentAccess(user, contact.Department?.key);

  await db.Activity.create({
    type: "email",
    title: "Email sent (demo)",
    description: "A one-off demo email was sent from the contact profile.",
    contactId,
    userId: user.id,
    occurredAt: new Date(),
  });
  await contact.update({ engagementStatus: "Delivered", lastActivityAt: new Date() });
  await recordAudit({ userId: user.id, action: "Sent demo email", module: "contacts", resourceType: "Contact", resourceId: contactId });

  revalidatePath(`/contacts/${contactId}`);
}

export async function sendDemoWhatsappAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  const body = formData.get("body") || "Hi! Following up on your interest in our programs - happy to answer any questions.";

  try {
    const conversation = await sendDemoWhatsappMessage(user, contactId, body);
    const contact = await Contact.findByPk(contactId);
    if (contact) await contact.update({ lastActivityAt: new Date() });
    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/conversations");
    return { conversationId: conversation.id };
  } catch (err) {
    return { error: err?.message || "The message could not be sent." };
  }
}

export async function replyInConversationAction(formData) {
  const user = await requireUser();
  const conversationId = formData.get("conversationId");
  const body = formData.get("body");
  if (!body || !body.trim()) return { error: "Write a message first." };
  try {
    await replyInConversation(user, conversationId, body.trim());
    revalidatePath(`/conversations`);
    return { success: true };
  } catch (err) {
    return { error: err?.message || "The message could not be sent." };
  }
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
  try {
    const conversation = await simulateInboundReply(user, conversationId, body);
    revalidatePath("/conversations");
    revalidatePath(`/contacts/${conversation.contactId}`);
    return { success: true };
  } catch (err) {
    return { error: err?.message || "The reply could not be recorded." };
  }
}

export async function assignConversationAction(formData) {
  const user = await requireUser();
  const conversationId = formData.get("conversationId");
  const assigneeId = formData.get("assigneeId");
  await assignConversation(user, conversationId, assigneeId);
  revalidatePath("/conversations");
}
