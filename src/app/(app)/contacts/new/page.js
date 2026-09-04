import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys, hasPermission } from "@/lib/permissions/rbac";
import { listDepartments } from "@/lib/services/departmentService";
import { getCompanies } from "@/lib/services/companyService";
import { listUsers } from "@/lib/services/userService";
import { listLists, listFolders } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import ContactForm from "@/components/contacts/ContactForm";

export const metadata = { title: "Create Contact" };

export default async function NewContactPage() {
  const user = await requireUserWithPermission("contacts.create");
  const allDepartments = await listDepartments();
  const accessibleKeys = getAccessibleDepartmentKeys(user, allDepartments.map((d) => d.key));
  const departments = allDepartments
    .filter((d) => accessibleKeys.includes(d.key) && !d.isUniversityWide)
    .map((d) => ({ key: d.key, name: d.name }));

  const canSeeLists = hasPermission(user, "lists.view");
  // Companies is an IKL/HSM concept in this pilot (Marketing manages
  // individual leads, not B2B companies) - Marketing roles hold no
  // companies.* permission at all, so this must never be an unconditional
  // call or the whole page 403s for them.
  const canSeeCompanies = hasPermission(user, "companies.view");
  const [companiesResult, usersRaw, listsRaw, foldersRaw] = await Promise.all([
    canSeeCompanies ? getCompanies(user, { page: 1, limit: 300 }) : Promise.resolve({ data: [] }),
    listUsers(user).catch(() => []),
    canSeeLists ? listLists(user) : Promise.resolve([]),
    canSeeLists ? listFolders(user) : Promise.resolve([]),
  ]);
  const companies = companiesResult.data.map((c) => ({ id: c.id, name: c.name }));
  const owners = usersRaw.map((u) => ({ id: u.id, name: u.name }));
  const lists = listsRaw.map((l) => l.get({ plain: true }));
  const folders = foldersRaw.map((f) => f.get({ plain: true }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: "New Contact" }]}
        title="Create Contact"
        description="Add a new contact to the CRM."
      />
      <Card className="max-w-2xl">
        <ContactForm
          departments={departments}
          companies={companies}
          owners={owners}
          lists={lists}
          folders={folders}
          canManageCompanies={canSeeCompanies}
        />
      </Card>
    </div>
  );
}
