import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getCompanyById } from "@/lib/services/companyService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import CompanyForm from "@/components/companies/CompanyForm";

export const metadata = { title: "Edit Company" };

export default async function EditCompanyPage({ params }) {
  const user = await requireUserWithPermission("companies.update");
  const { id } = await params;

  const companyRaw = await getCompanyById(user, id);
  if (!companyRaw) notFound();
  const company = companyRaw.get({ plain: true });

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${id}` }, { label: "Edit" }]}
        title="Edit Company"
      />
      <Card className="max-w-2xl">
        <CompanyForm company={company} />
      </Card>
    </div>
  );
}
