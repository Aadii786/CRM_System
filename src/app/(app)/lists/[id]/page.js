import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getList, getListMembers } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import Pagination from "@/components/ui/Pagination";
import ContactsTable from "@/components/contacts/ContactsTable";
import AddContactsToListButton from "@/components/lists/AddContactsToListButton";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `List ${id}` };
}

export default async function ListDetailPage({ params, searchParams }) {
  const user = await requireUserWithPermission("lists.view");
  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const listRaw = await getList(user, id);
  if (!listRaw) notFound();
  const list = listRaw.get({ plain: true });

  const { data: membersRaw, pagination } = await getListMembers(user, id, { page, limit: 25 });
  const members = membersRaw.map((c) => c.get({ plain: true }));
  const canManage = hasPermission(user, "lists.update");

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Folders", href: "/folders" },
          ...(list.folder ? [{ label: list.folder.name, href: `/folders/${list.folder.id}` }] : []),
          { label: list.name },
        ]}
        title={list.name}
        description={list.description || `${list.folder?.Company?.name ? `Company: ${list.folder.Company.name} · ` : ""}Folder: ${list.folder?.name || "—"}`}
        actions={
          <>
            <Badge tone="primary">{list.contactCount.toLocaleString()} contacts</Badge>
            {canManage && <AddContactsToListButton listId={list.id} />}
          </>
        }
      />
      <ContactsTable contacts={members} canEdit={hasPermission(user, "contacts.update")} />
      <div className="mt-4">
        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={(p) => `/lists/${id}?page=${p}`} />
      </div>
    </div>
  );
}
