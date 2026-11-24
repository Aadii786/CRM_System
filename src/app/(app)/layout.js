import { requireUser } from "@/lib/auth/requireUser";
import { getNavSections } from "@/lib/constants/navigation";
import { listForUser, unreadCount as getUnreadCount } from "@/lib/services/notificationService";
import { runAllDueThrottled } from "@/lib/services/schedulerService";
import AppShell from "@/components/layout/AppShell";
import { guideKeyFor } from "@/lib/utils/guideKey";
import { isLiveMode, deliveryNotice } from "@/lib/constants/appMode";

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
  // Sprint 3: the same opportunistic trigger now also runs automation waits, scheduled campaigns and
  // follow-up reminders, so hosts without cron (the test link) behave like a real deployment.
  // Not awaited: a slow batch (many scheduled sends) must never delay the page the user asked for.
  runAllDueThrottled().catch((err) => console.error("[scheduler] failed:", err?.message || err));

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
    <AppShell user={user} guideKey={guideKeyFor(user)} navSections={navSections} notifications={serializedNotifications} unreadCount={unread} showDemoBanner={!isLiveMode()} deliveryNotice={deliveryNotice()}>
      {children}
    </AppShell>
  );
}
