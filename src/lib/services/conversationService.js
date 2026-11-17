import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";
import { sendWhatsappToContact, handleInboundMessage, contactNumber } from "./whatsappService";
import { isSimulatedWhatsApp } from "@/lib/whatsapp/provider";

const { Conversation, Message, Contact, User } = db;

export async function listConversations(user, { status, assignedToMe } = {}) {
  requirePermission(user, "conversations.view");
  const deptKeys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  const deptIds = await departmentIdsForKeys(deptKeys);
  if (deptIds.length === 0) return [];

  const where = { departmentId: { [Op.in]: deptIds } };
  if (status) where.status = status;
  if (assignedToMe) where.assignedTo = user.id;

  return Conversation.findAll({
    where,
    include: [
      { model: Contact, attributes: ["id", "firstName", "lastName", "email", "phone", "whatsappNumber"] },
      { model: User, as: "assignee", attributes: ["id", "name", "avatarColor"] },
      { model: Message, as: "messages", separate: true, order: [["sentAt", "ASC"]] },
    ],
    order: [["lastMessageAt", "DESC"]],
    limit: 200,
  });
}

export async function getConversation(user, id) {
  requirePermission(user, "conversations.view");
  return Conversation.findByPk(id, {
    include: [
      { model: Contact },
      { model: User, as: "assignee", attributes: ["id", "name", "avatarColor"] },
      { model: Message, as: "messages", separate: true, order: [["sentAt", "ASC"]] },
    ],
  });
}

/**
 * Sends a WhatsApp message to a contact (opens their conversation if needed). It goes through the
 * WhatsApp provider: the simulated one in demo mode, the IT department's API once connected.
 */
export async function sendDemoWhatsappMessage(user, contactId, body) {
  requirePermission(user, "conversations.reply");
  const contact = await Contact.findByPk(contactId);
  if (!contact) throw new Error("Contact not found.");
  const result = await sendWhatsappToContact(contact, body, { userId: user.id });
  if (!result.ok) throw new Error(result.error || "The message could not be sent.");
  await recordAudit({ userId: user.id, action: `Sent WhatsApp message${result.simulated ? " (demo mode)" : ""}`, module: "conversations", resourceType: "Conversation", resourceId: result.conversationId });
  return Conversation.findByPk(result.conversationId);
}

export async function replyInConversation(user, conversationId, body) {
  requirePermission(user, "conversations.reply");
  const conversation = await Conversation.findByPk(conversationId, { include: [Contact] });
  if (!conversation) throw new Error("Conversation not found.");
  const result = await sendWhatsappToContact(conversation.Contact, body, { userId: user.id });
  if (!result.ok) throw new Error(result.error || "The message could not be sent.");
  // Replying clears the unread badge: someone has dealt with it.
  await conversation.update({ unreadCount: 0 });
  return conversation;
}

/**
 * Demo only (simulated WhatsApp provider): produces a reply from the contact through the same
 * path a real webhook reply takes, so scoring and automations react exactly as they will for real.
 */
export async function simulateInboundReply(user, conversationId, body) {
  requirePermission(user, "conversations.reply");
  if (!isSimulatedWhatsApp()) throw new Error("Replies can only be simulated while the WhatsApp provider is the simulated one.");
  const conversation = await Conversation.findByPk(conversationId, { include: [Contact] });
  if (!conversation) throw new Error("Conversation not found.");
  const number = contactNumber(conversation.Contact);
  if (!number) throw new Error("This person has no phone number to reply from.");
  const result = await handleInboundMessage({ from: number, text: body });
  if (!result.recorded) throw new Error(`The reply was not recorded (${result.ignored || "unknown reason"}).`);
  return conversation;
}

/** Marks a conversation as read when staff open it. */
export async function markConversationRead(user, conversationId) {
  requirePermission(user, "conversations.view");
  await Conversation.update({ unreadCount: 0 }, { where: { id: conversationId } });
}

export async function listAssignableUsers(user) {
  const deptKeys = getAccessibleDepartmentKeys(user, await allDepartmentKeys());
  const deptIds = await departmentIdsForKeys(deptKeys);
  if (deptIds.length === 0) return [];
  return User.findAll({ where: { departmentId: { [Op.in]: deptIds }, status: "active" }, attributes: ["id", "name", "avatarColor"] });
}

export async function assignConversation(user, conversationId, assigneeId) {
  requirePermission(user, "conversations.assign");
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) throw new Error("Conversation not found.");
  await conversation.update({ assignedTo: assigneeId, status: "assigned" });
  await recordAudit({ userId: user.id, action: "Assigned WhatsApp conversation", module: "conversations", resourceType: "Conversation", resourceId: conversationId });
  return conversation;
}
