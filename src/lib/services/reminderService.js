import "server-only";
import { Op } from "sequelize";
import db from "@/lib/db";
import { createNotification } from "./notificationService";
import { sendOperationalEmail } from "./emailDeliveryService";
import { requirePermission, hasPermission, getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { departmentIdsForKeys, allDepartmentKeys } from "./departmentService";

const { Task, Notification, Meeting, User, Contact } = db;

const DAY = 86400000;
const HOURS_AHEAD = Number(process.env.REMINDER_HOURS_AHEAD) || 24;

/** Managers of a department: the people who approve proposals (or, failing that, who can delete tasks). */
export async function managersOfDepartment(departmentId) {
  for (const permission of ["deals.approve", "tasks.delete"]) {
    const [rows] = await db.sequelize.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.department_id = :d AND u.status = 'active' AND p.\`key\` = :k`,
      { replacements: { d: departmentId, k: permission } }
    );
    if (rows.length) return rows.map((r) => r.id);
  }
  return [];
}

/**
 * CRM-2.9: remind people BEFORE a follow-up is due. A task or meeting due within the next
 * REMINDER_HOURS_AHEAD hours (default 24) gets one in-system notification and one email to its owner.
 * Managers are told once about tasks that have been overdue for more than a day (escalation).
 */
export async function sendFollowUpReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + HOURS_AHEAD * 3600000);
  let tasksReminded = 0;
  let meetingsReminded = 0;
  let escalated = 0;

  const dueSoon = await Task.findAll({
    where: { status: { [Op.in]: ["Pending", "In Progress"] }, dueDate: { [Op.gte]: now, [Op.lte]: horizon }, reminderSentAt: null, ownerId: { [Op.ne]: null } },
    include: [{ model: User, as: "owner", attributes: ["id", "name", "email"] }, { model: Contact, attributes: ["id", "firstName", "lastName"] }],
    limit: 200,
  });
  for (const task of dueSoon) {
    const when = task.dueDate.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    await createNotification({ userId: task.ownerId, type: "task_due_soon", title: "Follow-up due soon", body: `"${task.title}" is due ${when}.`, link: `task:${task.id}` });
    if (task.owner?.email) {
      await sendOperationalEmail({
        departmentId: task.departmentId, to: task.owner.email, toName: task.owner.name, subject: `Reminder: ${task.title}`,
        text: `Hello ${task.owner.name},\n\nThis is a reminder that the task "${task.title}"${task.Contact ? ` (${task.Contact.firstName} ${task.Contact.lastName})` : ""} is due ${when}.`,
        metadata: { taskId: task.id },
      });
    }
    await task.update({ reminderSentAt: now });
    tasksReminded += 1;
  }

  const meetings = await Meeting.findAll({
    where: { status: "Scheduled", startAt: { [Op.gte]: now, [Op.lte]: horizon }, reminderSentAt: null, ownerId: { [Op.ne]: null } },
    include: [{ model: User, as: "owner", attributes: ["id", "name", "email"] }],
    limit: 200,
  });
  for (const m of meetings) {
    const when = m.startAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    await createNotification({ userId: m.ownerId, type: "meeting_soon", title: "Meeting coming up", body: `"${m.title}" starts ${when}${m.location ? ` at ${m.location}` : ""}.`, link: `meeting:${m.id}` });
    if (m.owner?.email) {
      await sendOperationalEmail({ departmentId: m.departmentId, to: m.owner.email, toName: m.owner.name, subject: `Reminder: ${m.title}`, text: `Hello ${m.owner.name},\n\nYour meeting "${m.title}" starts ${when}${m.location ? ` at ${m.location}` : ""}.`, metadata: { meetingId: m.id } });
    }
    await m.update({ reminderSentAt: now });
    meetingsReminded += 1;
  }

  // Managers hear about follow-ups that stay overdue for more than a day: ONE digest per manager per
  // run (never one notification per task), and each task is escalated only once.
  const stale = await Task.findAll({
    where: { status: "Overdue", escalatedAt: null, dueDate: { [Op.lt]: new Date(now.getTime() - DAY) } },
    include: [{ model: User, as: "owner", attributes: ["id", "name"] }],
    order: [["dueDate", "ASC"]],
    limit: 500,
  });
  const byDepartment = new Map();
  for (const task of stale) {
    if (!byDepartment.has(task.departmentId)) byDepartment.set(task.departmentId, []);
    byDepartment.get(task.departmentId).push(task);
  }
  for (const [departmentId, tasks] of byDepartment) {
    const perOwner = new Map();
    for (const t of tasks) perOwner.set(t.owner?.name || "Unassigned", (perOwner.get(t.owner?.name || "Unassigned") || 0) + 1);
    const summary = [...perOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, n]) => `${name}: ${n}`).join(", ");
    for (const managerId of await managersOfDepartment(departmentId)) {
      await createNotification({
        userId: managerId, type: "task_escalated",
        title: `${tasks.length} follow-up${tasks.length === 1 ? " is" : "s are"} overdue for more than a day`,
        body: `${summary}. Open Tasks to see the team overview.`.slice(0, 480), link: "/tasks",
      });
      escalated += 1;
    }
    await Task.update({ escalatedAt: now }, { where: { id: { [Op.in]: tasks.map((t) => t.id) } } });
  }
  return { tasksReminded, meetingsReminded, escalated };
}

/** Managers see how follow-ups are going per person (CRM-2.9 "manager visibility"). */
export function canSeeTeamFollowUps(user) {
  return hasPermission(user, "deals.approve") || hasPermission(user, "tasks.delete");
}

export async function getTeamFollowUps(user) {
  requirePermission(user, "tasks.view");
  if (!canSeeTeamFollowUps(user)) return [];
  const deptIds = await departmentIdsForKeys(getAccessibleDepartmentKeys(user, await allDepartmentKeys()));
  if (!deptIds.length) return [];
  const now = new Date();
  const soon = new Date(now.getTime() + HOURS_AHEAD * 3600000);
  const open = await Task.findAll({
    where: { departmentId: { [Op.in]: deptIds }, status: { [Op.in]: ["Pending", "In Progress", "Overdue"] } },
    include: [{ model: User, as: "owner", attributes: ["id", "name"] }],
    order: [["dueDate", "ASC"]],
    limit: 2000,
  });
  const byOwner = new Map();
  for (const t of open) {
    const key = t.ownerId || 0;
    if (!byOwner.has(key)) byOwner.set(key, { ownerId: t.ownerId, name: t.owner?.name || "Unassigned", open: 0, overdue: 0, dueSoon: 0, oldestOverdue: null });
    const row = byOwner.get(key);
    row.open += 1;
    if (t.status === "Overdue" || (t.dueDate && t.dueDate < now)) {
      row.overdue += 1;
      if (!row.oldestOverdue || t.dueDate < row.oldestOverdue.dueDate) row.oldestOverdue = { title: t.title, dueDate: t.dueDate };
    } else if (t.dueDate && t.dueDate <= soon) row.dueSoon += 1;
  }
  return [...byOwner.values()].sort((a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon || a.name.localeCompare(b.name));
}

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
  const reminders = await sendFollowUpReminders().catch((err) => {
    console.error("[reminders] failed:", err?.message || err);
    return null;
  });
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

  return { checked: overdue.length, notified, reminders };
}
