import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { getContactById } from "@/lib/services/contactService";
import { listDepartments } from "@/lib/services/departmentService";
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

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: `${contact.firstName} ${contact.lastName}`, href: `/contacts/${id}` }, { label: "Edit" }]}
        title="Edit Contact"
      />
      <Card className="max-w-2xl">
        <ContactForm departments={departments} contact={contact} />
      </Card>
    </div>
  );
}
