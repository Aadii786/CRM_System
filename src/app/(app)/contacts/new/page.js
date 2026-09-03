import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys, hasPermission } from "@/lib/permissions/rbac";
import { listDepartments } from "@/lib/services/departmentService";
import { getCompanies } from "@/lib/services/companyService";
import { listUsers } from "@/lib/services/userService";
import { listLists } from "@/lib/services/listService";
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
  const [{ data: companiesRaw }, usersRaw, listsRaw] = await Promise.all([
    getCompanies(user, { page: 1, limit: 300 }),
    listUsers(user).catch(() => []),
    canSeeLists ? listLists(user) : Promise.resolve([]),
  ]);
  const companies = companiesRaw.map((c) => ({ id: c.id, name: c.name }));
  const owners = usersRaw.map((u) => ({ id: u.id, name: u.name }));
  const lists = listsRaw.map((l) => l.get({ plain: true }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: "New Contact" }]}
        title="Create Contact"
        description="Add a new contact to the CRM."
      />
      <Card className="max-w-2xl">
        <ContactForm departments={departments} companies={companies} owners={owners} lists={lists} />
      </Card>
    </div>
  );
}
