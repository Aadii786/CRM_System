import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getIklDashboard } from "@/lib/services/reportingService";
import { getDeals } from "@/lib/services/dealService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import FunnelBars from "@/components/charts/FunnelBars";
import { Building2, Users, Handshake, Trophy, Wallet, FileText, CheckCircle2, Receipt, UserPlus, Activity, Star, Megaphone, Send, Eye, MousePointerClick, MailX } from "lucide-react";
import { formatNumber, formatCurrencyPKR, formatPercent } from "@/lib/utils/format";

export const metadata = { title: "IKL Dashboard" };

// "IKL Head Dashboard", "IKL Sales Dashboard", "IKL Marketing Dashboard": named after who is looking.
function dashboardIntro(user) {
  const keys = (user.roles || []).map((r) => r.key);
  const marketing = keys.includes("DEPARTMENT_MARKETING");
  const sales = keys.some((k) => k === "DEPARTMENT_SALES" || k === "IKL_HSM_EXECUTIVE");
  if (hasPermission(user, "deals.approve")) return { title: "IKL Head Dashboard", description: "All of IKL in one place: pipeline, proposals, leads, campaigns and money." };
  if (marketing && sales) return { title: "IKL Marketing & Sales Dashboard", description: "Your sales and marketing work: pipeline, leads and campaign results." };
  if (marketing) return { title: "IKL Marketing Dashboard", description: "Your marketing work: leads, the contact-to-client funnel and campaign results." };
  return { title: "IKL Sales Dashboard", description: "Your sales work: pipeline, proposals, invoices and leads." };
}

export default async function IklHsmDashboardPage() {
  const user = await requireUserWithPermission("dashboard.view");
  const [stats, dealsResult] = await Promise.all([
    getIklDashboard(user),
    getDeals(user, { limit: 6 }),
  ]);
  const recentDeals = dealsResult.data.map((d) => d.get({ plain: true }));
  const intro = dashboardIntro(user);
  const canSeeFinance = hasPermission(user, "invoices.manage");

  return (
    <div>
      <PageHeader
        title={intro.title}
        description={intro.description}
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

      <h2 className="text-sm font-semibold text-ink mb-2.5">Leads</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-4">
        <MetricCard label="Total leads" value={formatNumber(stats.leads.total)} icon={Users} tone="blue" href="/contacts" />
        <MetricCard label="New in 30 days" value={formatNumber(stats.leads.newLast30)} icon={UserPlus} tone="cyan" />
        <MetricCard label="Active" value={formatNumber(stats.leads.active)} icon={Activity} tone="green" />
        <MetricCard label="Inactive" value={formatNumber(stats.leads.inactive)} icon={Users} tone="neutral" />
        <MetricCard label="Qualified" value={formatNumber(stats.leads.qualified)} icon={Star} tone="amber" href="/contacts?status=Qualified" />
      </div>
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink mb-1">From contact to converted</h3>
        <p className="text-xs text-ink-muted mb-4">How many contacts reached each step: engaged, qualified and converted into a client.</p>
        <FunnelBars stages={stats.funnel} />
      </Card>

      {stats.campaignPanel && (
        <>
          <h2 className="text-sm font-semibold text-ink mb-2.5">Campaigns</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
            <MetricCard label="Campaigns" value={formatNumber(stats.campaignPanel.campaigns)} icon={Megaphone} tone="purple" href="/campaigns" />
            <MetricCard label="Emails sent" value={formatNumber(stats.campaignPanel.emailsSent)} icon={Send} tone="blue" />
            <MetricCard label="Open rate" value={formatPercent(stats.campaignPanel.openRate)} icon={Eye} tone="green" />
            <MetricCard label="Click rate" value={formatPercent(stats.campaignPanel.clickRate)} icon={MousePointerClick} tone="cyan" />
            <MetricCard label="Bounce rate" value={formatPercent(stats.campaignPanel.bounceRate)} icon={MailX} tone="amber" />
            <MetricCard label="Unsubscribe rate" value={formatPercent(stats.campaignPanel.unsubscribeRate)} icon={MailX} tone="neutral" />
          </div>
        </>
      )}

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

        {canSeeFinance && <Card>
          <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2"><Receipt className="size-4" /> Financials</h3>
          <div className="flex flex-col gap-3">
            <FinRow label="Total Invoiced" value={formatCurrencyPKR(stats.totalInvoiced)} />
            <FinRow label="Total Paid" value={formatCurrencyPKR(stats.totalPaid)} />
            <FinRow label="Outstanding" value={formatCurrencyPKR(Math.max(stats.totalInvoiced - stats.totalPaid, 0))} />
          </div>
        </Card>}
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
