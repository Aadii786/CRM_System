import { requireUserWithPermission } from "@/lib/auth/requireUser";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import CompanyForm from "@/components/companies/CompanyForm";

export const metadata = { title: "Create Company" };

export default async function NewCompanyPage() {
  await requireUserWithPermission("companies.create");
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: "New Company" }]} title="Create Company" />
      <Card className="max-w-2xl">
        <CompanyForm />
      </Card>
    </div>
  );
}
