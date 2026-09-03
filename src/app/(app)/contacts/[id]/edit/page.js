import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys, hasPermission } from "@/lib/permissions/rbac";
import { getContactById } from "@/lib/services/contactService";
import { listDepartments } from "@/lib/services/departmentService";
import { getCompanies } from "@/lib/services/companyService";
import { listUsers } from "@/lib/services/userService";
import { listLists, getListsForContact } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import ContactForm from "@/components/contacts/ContactForm";

export const metadata = { title: "Edit Contact" };

export default async function EditContactPage({ params }) {
  const user = await requireUserWithPermission("contacts.update");
  const { id } = await params;

  const contactRaw = await getContactById(user, id);
  if (!contactRaw) notFound();
  const contact = contactRaw.get({ plain: true });

  const allDepartments = await listDepartments();
  const accessibleKeys = getAccessibleDepartmentKeys(user, allDepartments.map((d) => d.key));
  const departments = allDepartments.filter((d) => accessibleKeys.includes(d.key) && !d.isUniversityWide).map((d) => ({ key: d.key, name: d.name }));

  const canSeeLists = hasPermission(user, "lists.view");
  const [{ data: companiesRaw }, usersRaw, listsRaw, contactLists] = await Promise.all([
    getCompanies(user, { page: 1, limit: 300 }),
    listUsers(user).catch(() => []),
    canSeeLists ? listLists(user) : Promise.resolve([]),
    canSeeLists ? getListsForContact(user, id) : Promise.resolve([]),
  ]);
  const companies = companiesRaw.map((c) => ({ id: c.id, name: c.name }));
  const owners = usersRaw.map((u) => ({ id: u.id, name: u.name }));
  const lists = listsRaw.map((l) => l.get({ plain: true }));
  const contactListIds = contactLists.map((l) => l.id);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: `${contact.firstName} ${contact.lastName}`, href: `/contacts/${id}` }, { label: "Edit" }]}
        title="Edit Contact"
      />
      <Card className="max-w-2xl">
        <ContactForm departments={departments} contact={contact} companies={companies} owners={owners} lists={lists} contactListIds={contactListIds} />
      </Card>
    </div>
  );
}
