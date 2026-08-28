import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { listDepartments } from "@/lib/services/departmentService";
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

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: "New Contact" }]}
        title="Create Contact"
        description="Add a new contact to the CRM."
      />
      <Card className="max-w-2xl">
        <ContactForm departments={departments} />
      </Card>
    </div>
  );
}
