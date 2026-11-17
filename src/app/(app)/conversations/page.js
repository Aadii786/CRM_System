import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listConversations, listAssignableUsers } from "@/lib/services/conversationService";
import PageHeader from "@/components/common/PageHeader";
import WhatsAppInbox from "@/components/conversations/WhatsAppInbox";
import { isSimulatedWhatsApp, whatsappProviderName } from "@/lib/whatsapp/provider";

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
        description={isSimulatedWhatsApp()
          ? `Shared WhatsApp inbox. Provider: ${whatsappProviderName()} (demo): nothing leaves the system until the WhatsApp service from the IT department is connected. Real replies arrive here through /api/whatsapp/webhook.`
          : "Shared WhatsApp inbox: replies from contacts land here and on the contact's history."}
      />
      <WhatsAppInbox simulated={isSimulatedWhatsApp()} conversations={conversations} users={users} currentUserId={user.id} canAssign={hasPermission(user, "conversations.assign")} />
    </div>
  );
}
