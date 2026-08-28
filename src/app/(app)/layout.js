import { requireUser } from "@/lib/auth/requireUser";
import { getNavSections } from "@/lib/constants/navigation";
import { listForUser, unreadCount as getUnreadCount } from "@/lib/services/notificationService";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const navSections = getNavSections(user);
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
