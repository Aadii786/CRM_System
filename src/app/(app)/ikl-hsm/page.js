import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getIklDashboard } from "@/lib/services/reportingService";
import { getDeals } from "@/lib/services/dealService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Building2, Users, Handshake, Trophy, Wallet, FileText, CheckCircle2, Receipt } from "lucide-react";
import { formatNumber, formatCurrencyPKR, formatPercent } from "@/lib/utils/format";

export const metadata = { title: "IKL/HSM Dashboard" };

export default async function IklHsmDashboardPage() {
  const user = await requireUserWithPermission("dashboard.view");
  const [stats, dealsResult] = await Promise.all([
    getIklDashboard(user),
    getDeals(user, { limit: 6 }),
  ]);
  const recentDeals = dealsResult.data.map((d) => d.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="IKL / HSM Dashboard"
        description="B2B corporate, government and institutional training CRM."
        actions={<Button href="/deals" variant="primary">View Pipeline</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Companies" value={formatNumber(stats.companies)} icon={Building2} href="/companies" tone="blue" />
        <MetricCard label="Contacts" value={formatNumber(stats.contacts)} icon={Users} tone="blue" />
        <MetricCard label="Open Deals" value={formatNumber(stats.openDeals)} icon={Handshake} href="/deals" tone="cyan" />
        <MetricCard label="Won Deals" value={formatNumber(stats.wonDeals)} icon={Trophy} tone="green" />
        <MetricCard label="Pipeline Value" value={formatCurrencyPKR(stats.pipelineValue)} icon={Wallet} tone="cyan" />
        <MetricCard label="Won Value" value={formatCurrencyPKR(stats.wonValue)} icon={Wallet} tone="green" />
        <MetricCard label="Proposals Sent" value={formatNumber(stats.proposalsSent)} icon={FileText} tone="amber" />
        <MetricCard label="Acceptance Rate" value={formatPercent(stats.proposalAcceptanceRate)} icon={CheckCircle2} tone="green" />
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <Card padding="none">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Recent Deals</h3>
            <Link href="/deals" className="text-sm text-primary hover:underline">View pipeline</Link>
          </div>
          <div className="divide-y divide-border">
            {recentDeals.map((d) => (
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt">
                <span className="text-sm text-ink truncate">{d.name}</span>
                <Badge tone="neutral">{d.stage?.name}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2"><Receipt className="size-4" /> Financials</h3>
          <div className="flex flex-col gap-3">
            <FinRow label="Total Invoiced" value={formatCurrencyPKR(stats.totalInvoiced)} />
            <FinRow label="Total Paid" value={formatCurrencyPKR(stats.totalPaid)} />
            <FinRow label="Outstanding" value={formatCurrencyPKR(Math.max(stats.totalInvoiced - stats.totalPaid, 0))} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function FinRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}
