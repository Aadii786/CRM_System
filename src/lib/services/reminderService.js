import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { createNotification } from "./notificationService";

const { Task, Notification } = db;

/**
 * Finds tasks whose due date has passed while they're still Pending/In
 * Progress, flips them to Overdue, and creates a real notification for
 * the owner (once per task - checked via the notification's `link`).
 *
 * There's no always-on background worker in this deployment, so this is
 * called from two places to approximate "automated": (1) the app shell
 * layout, so it runs whenever anyone is actively using the app, and (2)
 * `/api/cron/reminders`, a route a real scheduler (Vercel Cron, an
 * external cron service, etc.) can hit on a fixed interval for genuine
 * 24/7 automation independent of whether anyone's logged in - see
 * vercel.json. Either way, these are real DB writes, not seeded/fake data.
 */
// Throttles how often the app-shell layout trigger actually hits the
// database - it runs on every page navigation otherwise, which is wasteful
// for a check that only needs to happen every so often. The /api/cron/
// reminders route bypasses this (a real scheduler controls its own
// interval instead).
let lastLayoutRun = 0;
const LAYOUT_THROTTLE_MS = 60_000;

export async function reconcileOverdueTasksThrottled() {
  if (Date.now() - lastLayoutRun < LAYOUT_THROTTLE_MS) return null;
  lastLayoutRun = Date.now();
  return reconcileOverdueTasks();
}

export async function reconcileOverdueTasks() {
  const now = new Date();
  const overdue = await Task.findAll({
    where: {
      dueDate: { [Op.lt]: now },
      status: { [Op.in]: ["Pending", "In Progress"] },
    },
  });

  let notified = 0;
  for (const task of overdue) {
    await task.update({ status: "Overdue" });

    if (!task.ownerId) continue;
    const link = `task:${task.id}`;
    const existing = await Notification.findOne({ where: { userId: task.ownerId, type: "task_overdue", link } });
    if (existing) continue;

    await createNotification({
      userId: task.ownerId,
      type: "task_overdue",
      title: "Task overdue",
      body: `"${task.title}" was due ${task.dueDate.toLocaleDateString()} and is still open.`,
      link,
    });
    notified++;
  }

  return { checked: overdue.length, notified };
}
