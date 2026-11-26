import Link from "next/link";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import { resolveRange, toIsoDay, daysAgoIso } from "@/lib/utils/dateRange";
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

/** /path?a=b&c=d without empty values: every dashboard tile opens the list behind its number. */
function to(path, params = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

export default async function IklHsmDashboardPage({ searchParams }) {
  const user = await requireUserWithPermission("dashboard.view");
  const range = resolveRange(await searchParams);
  const [stats, dealsResult] = await Promise.all([
    getIklDashboard(user, range),
    getDeals(user, { limit: 6 }),
  ]);
  const recentDeals = dealsResult.data.map((d) => d.get({ plain: true }));
  const intro = dashboardIntro(user);
  const canSeeFinance = hasPermission(user, "invoices.manage");
  const from = range.from ? toIsoDay(range.from) : undefined, until = range.to ? toIsoDay(range.to) : undefined;
  const last30 = daysAgoIso(30);
  const leadDates = { createdFrom: from, createdTo: until };
  const funnel = stats.funnel.map((s, i) => ({ ...s, href: to("/contacts", { ...leadDates, status: [undefined, "engaged_plus", "qualified_plus", "Converted"][i] }) }));

  return (
    <div>
      <PageHeader
        title={intro.title}
        description={intro.description}
        actions={<Button href="/deals" variant="primary">View Pipeline</Button>}
      />

      <DateRangeFilter preset={range.preset} from={toIsoDay(range.from)} to={toIsoDay(range.to)} label={range.label} />
      {range.active && <p className="text-xs text-ink-muted -mt-3 mb-4">Companies, contacts, open deals and pipeline value are current totals. Won deals, proposals, money, leads and campaigns follow the chosen period.</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Companies" value={formatNumber(stats.companies)} icon={Building2} href="/companies" tone="blue" />
        <MetricCard label="Contacts" value={formatNumber(stats.contacts)} icon={Users} href="/contacts" tone="blue" />
        <MetricCard label="Open Deals" value={formatNumber(stats.openDeals)} icon={Handshake} href="/deals?status=open" tone="cyan" />
        <MetricCard label={range.active ? "Won in period" : "Won Deals"} value={formatNumber(stats.wonDeals)} icon={Trophy} href={to("/deals", { status: "won", closedFrom: from, closedTo: until })} tone="green" />
        <MetricCard label="Pipeline Value" value={formatCurrencyPKR(stats.pipelineValue)} icon={Wallet} href="/deals?status=open" tone="cyan" />
        <MetricCard label={range.active ? "Won value in period" : "Won Value"} value={formatCurrencyPKR(stats.wonValue)} icon={Wallet} href={to("/deals", { status: "won", closedFrom: from, closedTo: until })} tone="green" />
        <MetricCard label={range.active ? "Proposals sent in period" : "Proposals Sent"} value={formatNumber(stats.proposalsSent)} icon={FileText} href={to("/deals", { proposal: "sent", proposalFrom: from, proposalTo: until })} tone="amber" />
        <MetricCard label="Acceptance Rate" value={formatPercent(stats.proposalAcceptanceRate)} icon={CheckCircle2} href={to("/deals", { proposal: "accepted", proposalFrom: from, proposalTo: until })} tone="green" />
      </div>

      <h2 className="text-sm font-semibold text-ink mb-2.5">Leads</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-4">
        <MetricCard label={range.active ? "Leads in period" : "Total leads"} value={formatNumber(stats.leads.total)} icon={Users} tone="blue" href={to("/contacts", leadDates)} />
        <MetricCard label={range.active ? "New in period" : "New in 30 days"} value={formatNumber(stats.leads.newLast30)} icon={UserPlus} tone="cyan" href={range.active ? to("/contacts", leadDates) : to("/contacts", { createdFrom: last30 })} />
        <MetricCard label="Active" value={formatNumber(stats.leads.active)} icon={Activity} tone="green" href={to("/contacts", { ...leadDates, engagement: "active" })} />
        <MetricCard label="Inactive" value={formatNumber(stats.leads.inactive)} icon={Users} tone="neutral" href={to("/contacts", { ...leadDates, engagement: "notactive" })} />
        <MetricCard label="Qualified" value={formatNumber(stats.leads.qualified)} icon={Star} tone="amber" href={to("/contacts", { ...leadDates, status: "Qualified" })} />
      </div>
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-ink mb-1">From contact to converted</h3>
        <p className="text-xs text-ink-muted mb-4">How many contacts reached each step: engaged, qualified and converted into a client.</p>
        <FunnelBars stages={funnel} />
      </Card>

      {stats.campaignPanel && (
        <>
          <h2 className="text-sm font-semibold text-ink mb-2.5">Campaigns</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 mb-6">
            <MetricCard label="Campaigns" value={formatNumber(stats.campaignPanel.campaigns)} icon={Megaphone} tone="purple" href="/campaigns" />
            <MetricCard label="Emails sent" value={formatNumber(stats.campaignPanel.emailsSent)} icon={Send} href="/campaigns" tone="blue" />
            <MetricCard label="Open rate" value={formatPercent(stats.campaignPanel.openRate)} icon={Eye} href="/campaigns" tone="green" />
            <MetricCard label="Click rate" value={formatPercent(stats.campaignPanel.clickRate)} icon={MousePointerClick} href="/campaigns" tone="cyan" />
            <MetricCard label="Bounce rate" value={formatPercent(stats.campaignPanel.bounceRate)} icon={MailX} href="/campaigns" tone="amber" />
            <MetricCard label="Unsubscribe rate" value={formatPercent(stats.campaignPanel.unsubscribeRate)} icon={MailX} href="/campaigns" tone="neutral" />
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
            <FinRow href="/reports/revenue" label="Total Invoiced" value={formatCurrencyPKR(stats.totalInvoiced)} />
            <FinRow href="/reports/revenue" label="Total Paid" value={formatCurrencyPKR(stats.totalPaid)} />
            <FinRow href="/reports/revenue" label="Outstanding" value={formatCurrencyPKR(Math.max(stats.totalInvoiced - stats.totalPaid, 0))} />
          </div>
        </Card>}
      </div>
    </div>
  );
}

function FinRow({ label, value, href }) {
  return (
    <Link href={href} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm hover:bg-surface-alt rounded-sm px-1 -mx-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </Link>
  );
}
