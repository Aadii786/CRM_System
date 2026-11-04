import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listPipelines } from "@/lib/services/dealService";
import { getCompanies } from "@/lib/services/companyService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import DealForm from "@/components/deals/DealForm";
import { listProgramOptions } from "@/lib/services/programService";
import { hasPermission } from "@/lib/permissions/rbac";

export const metadata = { title: "Create Deal" };

export default async function NewDealPage() {
  const user = await requireUserWithPermission("deals.create");
  const [pipelinesRaw, companiesResult, programs] = await Promise.all([
    listPipelines(user),
    getCompanies(user, { limit: 200 }),
    hasPermission(user, "programs.view") ? listProgramOptions(user) : Promise.resolve([]),
  ]);
  const pipelines = pipelinesRaw.map((p) => p.get({ plain: true }));

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: "New Deal" }]} title="Create Deal" />
      <Card className="max-w-2xl">
        <DealForm pipelines={pipelines} companies={companiesResult.data} programs={programs} />
      </Card>
    </div>
  );
}
