import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listFolders, listLists } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import ListsPageClient from "@/components/lists/ListsPageClient";

export const metadata = { title: "Lists" };

export default async function ListsPage() {
  const user = await requireUserWithPermission("lists.view");
  const [foldersRaw, listsRaw] = await Promise.all([listFolders(user), listLists(user)]);
  const folders = foldersRaw.map((f) => f.get({ plain: true }));
  const lists = listsRaw.map((l) => l.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Static, manually-managed contact groups organized into folders - keep them for targeted, one-off sends. For audiences that should update themselves automatically, use Segments instead."
      />
      <ListsPageClient folders={folders} lists={lists} canManage={hasPermission(user, "lists.create")} canDelete={hasPermission(user, "lists.delete")} />
    </div>
  );
}
