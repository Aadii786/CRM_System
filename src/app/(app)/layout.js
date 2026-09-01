import { requireUser } from "@/lib/auth/requireUser";
import { getNavSections } from "@/lib/constants/navigation";
import { listForUser, unreadCount as getUnreadCount } from "@/lib/services/notificationService";
import { reconcileOverdueTasksThrottled } from "@/lib/services/reminderService";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const navSections = getNavSections(user);

  // Real automated overdue-task reminders (requirements: "automated
  // reminders/notifications for pending follow-ups and overdue
  // activities"). There's no always-on background worker in this
  // deployment, so this runs opportunistically whenever the app shell
  // renders - throttled so it isn't hitting the DB on every navigation.
  // /api/cron/reminders covers genuine 24/7 automation independent of
  // whether anyone is logged in (see vercel.json).
  await reconcileOverdueTasksThrottled();

  const [notifications, unread] = await Promise.all([
    listForUser(user.id, 8),
    getUnreadCount(user.id),
  ]);

  const serializedNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt,
  }));

  return (
    <AppShell user={user} navSections={navSections} notifications={serializedNotifications} unreadCount={unread}>
      {children}
    </AppShell>
  );
}
