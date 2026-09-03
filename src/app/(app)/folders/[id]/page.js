import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getFolder, listLists, listFolders } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import FolderDetailClient from "@/components/lists/FolderDetailClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Folder ${id}` };
}

export default async function FolderDetailPage({ params }) {
  const user = await requireUserWithPermission("lists.view");
  const { id } = await params;

  const folderRaw = await getFolder(user, id);
  if (!folderRaw) notFound();
  const folder = folderRaw.get({ plain: true });

  const [listsRaw, allFoldersRaw] = await Promise.all([
    listLists(user, { folderId: id }),
    listFolders(user),
  ]);
  const lists = listsRaw.map((l) => l.get({ plain: true }));
  const otherFolders = allFoldersRaw.map((f) => f.get({ plain: true })).filter((f) => f.id !== Number(id));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Folders", href: "/folders" }, { label: folder.name }]}
        title={folder.name}
        description={folder.Company ? `Company: ${folder.Company.name}` : "General folder"}
        actions={<Badge tone="neutral">{lists.length} lists</Badge>}
      />
      <FolderDetailClient
        folder={folder}
        lists={lists}
        otherFolders={otherFolders}
        canManage={hasPermission(user, "lists.create")}
        canDelete={hasPermission(user, "lists.delete")}
      />
    </div>
  );
}
