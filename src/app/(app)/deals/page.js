import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listPipelines, getPipelineBoard } from "@/lib/services/dealService";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import PipelineBoard from "@/components/deals/PipelineBoard";
import PipelineSelect from "@/components/deals/PipelineSelect";
import EmptyState from "@/components/ui/EmptyState";
import { Plus, Handshake } from "lucide-react";
import { formatCurrencyPKR } from "@/lib/utils/format";

export const metadata = { title: "Deals" };

export default async function DealsPage({ searchParams }) {
  const user = await requireUserWithPermission("deals.view");
  const sp = await searchParams;

  const pipelinesRaw = await listPipelines(user);
  if (pipelinesRaw.length === 0) {
    return (
      <div>
        <PageHeader title="Deals & Pipelines" />
        <EmptyState icon={Handshake} title="No pipelines configured" description="Pipelines are set up per department in Settings." />
      </div>
    );
  }
  const pipelines = pipelinesRaw.map((p) => p.get({ plain: true }));
  const selectedId = sp.pipeline ? Number(sp.pipeline) : pipelines.find((p) => p.isDefault)?.id || pipelines[0].id;

  const board = await getPipelineBoard(user, selectedId);
  const pipeline = board.pipeline.get({ plain: true });
  const byStage = Object.fromEntries(
    Object.entries(board.byStage).map(([stageId, deals]) => [stageId, deals.map((d) => d.get({ plain: true }))])
  );

  const totalValue = Object.values(byStage).flat().reduce((sum, d) => sum + Number(d.value), 0);
  const totalDeals = Object.values(byStage).flat().length;

  return (
    <div>
      <PageHeader
        title="Deals & Pipelines"
        description={`${totalDeals} open deals worth ${formatCurrencyPKR(totalValue)} in this pipeline.`}
        actions={hasPermission(user, "deals.create") && <Button href="/deals/new" variant="primary" icon={Plus}>Create Deal</Button>}
      />

      <div className="flex items-center gap-3 mb-5">
        <PipelineSelect pipelines={pipelines} currentId={selectedId} />
      </div>

      <PipelineBoard pipeline={pipeline} byStage={byStage} />
    </div>
  );
}
