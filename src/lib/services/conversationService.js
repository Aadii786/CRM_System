import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { requirePermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";
import { recordAudit } from "./auditService";

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
 * Finds or opens a WhatsApp conversation for a contact and appends an
 * outbound message. This is the "Send WhatsApp" demo interaction
 * (requirements #61) - simulated only, no real WhatsApp API is called
 * (requirements #63/#106).
 */
export async function sendDemoWhatsappMessage(user, contactId, body) {
  requirePermission(user, "conversations.reply");
  const contact = await Contact.findByPk(contactId);
  if (!contact) throw new Error("Contact not found.");

  let conversation = await Conversation.findOne({ where: { contactId } });
  if (!conversation) {
    conversation = await Conversation.create({
      contactId,
      channel: "whatsapp",
      status: "assigned",
      assignedTo: user.id,
      departmentId: contact.departmentId,
      lastMessageAt: new Date(),
      lastMessagePreview: body.slice(0, 120),
      unreadCount: 0,
    });
  }

  await Message.create({
    conversationId: conversation.id,
    direction: "outbound",
    senderType: "user",
    senderId: user.id,
    body,
    status: "sent",
    sentAt: new Date(),
  });

  await conversation.update({
    lastMessageAt: new Date(),
    lastMessagePreview: body.slice(0, 120),
    status: conversation.status === "closed" ? "assigned" : conversation.status,
    assignedTo: conversation.assignedTo || user.id,
  });

  await db.Activity.create({
    type: "whatsapp",
    title: "WhatsApp message sent",
    description: body,
    contactId,
    userId: user.id,
    occurredAt: new Date(),
  });

  await recordAudit({ userId: user.id, action: "Sent WhatsApp message (demo)", module: "conversations", resourceType: "Conversation", resourceId: conversation.id });

  return conversation;
}

export async function replyInConversation(user, conversationId, body) {
  requirePermission(user, "conversations.reply");
  const conversation = await Conversation.findByPk(conversationId, { include: [Contact] });
  if (!conversation) throw new Error("Conversation not found.");

  await Message.create({
    conversationId,
    direction: "outbound",
    senderType: "user",
    senderId: user.id,
    body,
    status: "sent",
    sentAt: new Date(),
  });
  await conversation.update({ lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 120) });

  await db.Activity.create({
    type: "whatsapp",
    title: "WhatsApp message sent",
    description: body,
    contactId: conversation.contactId,
    userId: user.id,
    occurredAt: new Date(),
  });

  return conversation;
}

/**
 * Simulates the contact replying (requirements #27: demonstrate whether a
 * WhatsApp reply can trigger automation). In this demo the "reply" is
 * operator-triggered rather than from a real WhatsApp webhook.
 */
export async function simulateInboundReply(user, conversationId, body) {
  requirePermission(user, "conversations.reply");
  const conversation = await Conversation.findByPk(conversationId, { include: [Contact] });
  if (!conversation) throw new Error("Conversation not found.");

  await Message.create({
    conversationId,
    direction: "inbound",
    senderType: "contact",
    body,
    status: "delivered",
    sentAt: new Date(),
  });
  await conversation.update({
    lastMessageAt: new Date(),
    lastMessagePreview: body.slice(0, 120),
    status: "open",
    unreadCount: conversation.unreadCount + 1,
  });

  await db.Activity.create({
    type: "whatsapp",
    title: "WhatsApp reply received",
    description: body,
    contactId: conversation.contactId,
    occurredAt: new Date(),
  });

  return conversation;
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
