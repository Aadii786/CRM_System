import "server-only";
import db from "@/lib/db";

const { Notification } = db;

export async function listForUser(userId, limit = 8) {
  return Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
  });
}

export async function unreadCount(userId) {
  return Notification.count({ where: { userId, isRead: false } });
}

export async function markAllRead(userId) {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
}

export async function createNotification({ userId, type, title, body, link }) {
  return Notification.create({ userId, type, title, body, link, isRead: false });
}
