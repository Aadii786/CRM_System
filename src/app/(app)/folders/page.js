import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listFolders, listLists } from "@/lib/services/listService";
import { getCompanies } from "@/lib/services/companyService";
import PageHeader from "@/components/common/PageHeader";
import FoldersPageClient from "@/components/lists/FoldersPageClient";

export const metadata = { title: "Folders" };

export default async function FoldersPage() {
  const user = await requireUserWithPermission("lists.view");
  const [foldersRaw, listsRaw, { data: companiesRaw }] = await Promise.all([
    listFolders(user),
    listLists(user),
    getCompanies(user, { page: 1, limit: 300 }),
  ]);
  const folders = foldersRaw.map((f) => f.get({ plain: true }));
  const lists = listsRaw.map((l) => l.get({ plain: true }));
  const companies = companiesRaw.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <PageHeader
        title="Folders"
        description="Organize Lists into Folders - optionally scoped to a company (Company → Folder → List → Contact), or general folders shared across your department."
      />
      <FoldersPageClient
        folders={folders}
        lists={lists}
        companies={companies}
        canManage={hasPermission(user, "lists.create")}
        canDelete={hasPermission(user, "lists.delete")}
      />
    </div>
  );
}
