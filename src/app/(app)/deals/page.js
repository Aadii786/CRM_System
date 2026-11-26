import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listPipelines, getPipelineBoard } from "@/lib/services/dealService";
import { listProgramOptions } from "@/lib/services/programService";
import { listCompanyOptions } from "@/lib/services/companyService";
import { listAssignableUsers } from "@/lib/services/conversationService";
import FilterBar from "@/components/common/FilterBar";
import SearchInput from "@/components/ui/SearchInput";
import UrlSelect from "@/components/ui/UrlSelect";
import UrlDateInput from "@/components/ui/UrlDateInput";
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
        <EmptyState icon={Handshake} tone="cyan" title="No pipelines configured" description="Pipelines are set up per department in Settings." />
      </div>
    );
  }
  const pipelines = pipelinesRaw.map((p) => p.get({ plain: true }));
  const selectedId = sp.pipeline ? Number(sp.pipeline) : pipelines.find((p) => p.isDefault)?.id || pipelines[0].id;

  const filters = { q: sp.q || "", programId: sp.program, companyId: sp.company, ownerId: sp.owner, status: sp.status, createdFrom: sp.createdFrom, createdTo: sp.createdTo, proposal: sp.proposal, proposalFrom: sp.proposalFrom, proposalTo: sp.proposalTo, closedFrom: sp.closedFrom, closedTo: sp.closedTo };
  const filtered = Object.values(filters).some(Boolean);
  const [board, programOptions, companyOptions, owners] = await Promise.all([
    getPipelineBoard(user, selectedId, filters),
    hasPermission(user, "programs.view") ? listProgramOptions(user) : Promise.resolve([]),
    hasPermission(user, "companies.view") ? listCompanyOptions(user) : Promise.resolve([]),
    listAssignableUsers(user),
  ]);
  const pipeline = board.pipeline.get({ plain: true });
  const byStage = Object.fromEntries(
    Object.entries(board.byStage).map(([stageId, deals]) => [stageId, deals.map((d) => d.get({ plain: true }))])
  );

  const allDeals = Object.values(byStage).flat();
  const openDeals = allDeals.filter((d) => d.status === "open");
  const totalValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const totalDeals = openDeals.length;
  const rejectedCount = allDeals.filter((d) => d.status === "lost").length;
  const wonCount = allDeals.filter((d) => d.status === "won").length;

  return (
    <div>
      <PageHeader
        title="Deals & Pipelines"
        description={`${totalDeals} open deals worth ${formatCurrencyPKR(totalValue)} ${filtered ? "matching the filters" : "in this pipeline"} · ${wonCount} won · ${rejectedCount} rejected`}
        actions={hasPermission(user, "deals.create") && <Button href="/deals/new" variant="primary" icon={Plus}>Create Deal</Button>}
      />

      <div className="flex items-center gap-3 mb-3">
        <PipelineSelect pipelines={pipelines} currentId={selectedId} />
      </div>
      <FilterBar className="mb-5">
        <div className="w-64"><SearchInput placeholder="Search name or reference" /></div>
        {programOptions.length > 0 && <UrlSelect paramName="program" allLabel="All programs" options={programOptions.map((p) => ({ value: String(p.id), label: p.title }))} className="w-52" />}
        {companyOptions.length > 0 && <UrlSelect paramName="company" allLabel="All organizations" options={companyOptions.map((c) => ({ value: String(c.id), label: c.name }))} className="w-52" />}
        {owners.length > 0 && <UrlSelect paramName="owner" allLabel="All owners" options={owners.map((u) => ({ value: String(u.id), label: u.name }))} className="w-40" />}
        <UrlSelect paramName="status" allLabel="Open, won or lost" options={[{ value: "open", label: "Open" }, { value: "won", label: "Won" }, { value: "lost", label: "Lost / rejected" }]} className="w-44" />
        <UrlDateInput paramName="createdFrom" label="Created from" />
        <UrlDateInput paramName="createdTo" label="to" />
        {filtered && <a href={`/deals?pipeline=${selectedId}`} className="text-sm text-primary hover:underline">Clear filters</a>}
      </FilterBar>

      <PipelineBoard pipeline={pipeline} byStage={byStage} canDrag={hasPermission(user, "deals.move_stage")} />
    </div>
  );
}
