import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listConversations, listAssignableUsers } from "@/lib/services/conversationService";
import PageHeader from "@/components/common/PageHeader";
import WhatsAppInbox from "@/components/conversations/WhatsAppInbox";

export const metadata = { title: "WhatsApp Conversations" };

export default async function ConversationsPage() {
  const user = await requireUserWithPermission("conversations.view");
  const [conversationsRaw, usersRaw] = await Promise.all([
    listConversations(user),
    listAssignableUsers(user),
  ]);
  const conversations = conversationsRaw.map((c) => c.get({ plain: true }));
  const users = usersRaw.map((u) => u.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Simulated WhatsApp business inbox - no real messages are sent (requirements #26-#27, #63)."
      />
      <WhatsAppInbox conversations={conversations} users={users} currentUserId={user.id} canAssign={hasPermission(user, "conversations.assign")} />
    </div>
  );
}
