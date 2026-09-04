import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listAutomations } from "@/lib/services/automationService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { Workflow, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { formatPercent } from "@/lib/utils/format";

export const metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const user = await requireUserWithPermission("automations.view");
  const automationsRaw = await listAutomations(user);
  const automations = automationsRaw.map((a) => a.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Trigger -> condition -> action workflows for lead nurturing and follow-up (requirements #22-#25)."
        actions={hasPermission(user, "automations.create") && <Button href="/automations/new" variant="primary">New Automation</Button>}
      />

      {automations.length === 0 ? (
        <EmptyState icon={Workflow} tone="purple" title="No automations found" description="Automations will appear here once created." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {automations.map((a) => {
            const conversionRate = a.totalEntered ? (a.totalConverted / a.totalEntered) * 100 : 0;
            return (
              <a key={a.id} href={`/automations/${a.id}`} className="block">
                <Card className="hover:border-primary-border hover:shadow-md transition-all h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-ink">{a.name}</h3>
                    <Badge status={a.status} />
                  </div>
                  <p className="text-xs text-ink-muted mb-4 line-clamp-2">{a.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat icon={Users} label="Entered" value={a.totalEntered.toLocaleString()} />
                    <MiniStat icon={CheckCircle2} label="Completed" value={a.totalCompleted.toLocaleString()} />
                    <MiniStat icon={TrendingUp} label="Converted" value={formatPercent(conversionRate)} />
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md bg-surface-alt p-2.5">
      <Icon className="size-3.5 text-ink-muted mx-auto mb-1" />
      <p className="text-sm font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-ink-muted">{label}</p>
    </div>
  );
}
