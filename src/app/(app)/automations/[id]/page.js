import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getAutomation, getAutomationExecutions } from "@/lib/services/automationService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import AutomationCanvas from "@/components/automation/AutomationCanvas";
import RunDemoAutomationButton from "@/components/automation/RunDemoAutomationButton";
import { Users, CheckCircle2, LogOut, TrendingUp } from "lucide-react";
import { formatPercent, formatDate } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Automation ${id}` };
}

export default async function AutomationDetailPage({ params }) {
  const user = await requireUserWithPermission("automations.view");
  const { id } = await params;

  const automationRaw = await getAutomation(user, id);
  if (!automationRaw) notFound();
  const automation = automationRaw.get({ plain: true });

  const executionsRaw = await getAutomationExecutions(user, id, 20);
  const executions = executionsRaw.map((e) => e.get({ plain: true }));

  const conversionRate = automation.totalEntered ? (automation.totalConverted / automation.totalEntered) * 100 : 0;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Automations", href: "/automations" }, { label: automation.name }]}
        title={automation.name}
        description={automation.description}
        actions={
          <>
            <Badge status={automation.status} />
            <RunDemoAutomationButton automationId={automation.id} canExecute={hasPermission(user, "automations.execute")} />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Total Entered" value={automation.totalEntered.toLocaleString()} icon={Users} />
        <MetricCard label="Active" value={automation.totalActive.toLocaleString()} icon={Users} />
        <MetricCard label="Completed" value={automation.totalCompleted.toLocaleString()} icon={CheckCircle2} />
        <MetricCard label="Conversion Rate" value={formatPercent(conversionRate)} icon={TrendingUp} />
      </div>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink mb-1">Workflow</h3>
        <p className="text-xs text-ink-muted mb-2">Trigger → conditions → actions/delays → exit.</p>
        <AutomationCanvas nodes={automation.nodes} />
      </Card>

      <Card padding="none">
        <div className="p-5 pb-0">
          <h3 className="text-sm font-semibold text-ink mb-1">Recent Executions</h3>
          <p className="text-xs text-ink-muted mb-4">Individual contacts that have entered this automation.</p>
        </div>
        <div className="px-5 pb-5">
          <DataTable
            columns={[
              { key: "contact", header: "Contact", render: (e) => `${e.Contact?.firstName} ${e.Contact?.lastName}` },
              { key: "score", header: "Lead Score", render: (e) => e.Contact?.leadScore },
              { key: "status", header: "Execution Status", render: (e) => <Badge status={e.status === "completed" ? "Completed" : e.status === "exited" ? "Cancelled" : "In Progress"}>{e.status}</Badge> },
              { key: "started", header: "Started", render: (e) => formatDate(e.startedAt) },
            ]}
            rows={executions}
          />
        </div>
      </Card>
    </div>
  );
}
