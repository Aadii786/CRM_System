import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getMarketingDashboard } from "@/lib/services/reportingService";
import { listCampaigns } from "@/lib/services/campaignService";
import { listAutomations } from "@/lib/services/automationService";
import { listSegments } from "@/lib/services/segmentService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Users, UserPlus, Activity, UserX, Megaphone, Mail, TrendingUp, MousePointerClick, Award, CheckCircle2 } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils/format";

export const metadata = { title: "Marketing Dashboard" };

export default async function MarketingDashboardPage() {
  const user = await requireUserWithPermission("dashboard.view");
  const [stats, campaignsRaw, automationsRaw, segmentsRaw] = await Promise.all([
    getMarketingDashboard(user),
    listCampaigns(user, { limit: 5 }),
    listAutomations(user),
    listSegments(user),
  ]);
  const campaigns = campaignsRaw.data.map((c) => c.get({ plain: true }));
  const automations = automationsRaw.map((a) => a.get({ plain: true }));
  const topSegments = segmentsRaw.map((s) => s.get({ plain: true })).slice(0, 5);

  return (
    <div>
      <PageHeader title="Marketing Dashboard" description="Contact database, campaigns and lead nurturing performance." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Total Contacts" value={formatNumber(stats.totalContacts)} icon={Users} href="/contacts" tone="blue" />
        <MetricCard label="New (30 days)" value={formatNumber(stats.newContacts)} icon={UserPlus} tone="blue" />
        <MetricCard label="Active" value={formatNumber(stats.activeContacts)} icon={Activity} tone="green" />
        <MetricCard label="Inactive" value={formatNumber(stats.inactiveContacts)} icon={UserX} tone="neutral" />
        <MetricCard label="Campaigns" value={formatNumber(stats.campaigns)} icon={Megaphone} href="/campaigns" tone="purple" />
        <MetricCard label="Emails Sent" value={formatNumber(stats.emailsSent)} icon={Mail} tone="purple" />
        <MetricCard label="Open Rate" value={formatPercent(stats.openRate)} icon={TrendingUp} tone="green" />
        <MetricCard label="Click Rate" value={formatPercent(stats.clickRate)} icon={MousePointerClick} tone="green" />
        <MetricCard label="Bounce Rate" value={formatPercent(stats.bounceRate)} icon={UserX} tone="amber" />
        <MetricCard label="Unsubscribe Rate" value={formatPercent(stats.unsubscribeRate)} icon={UserX} tone="red" />
        <MetricCard label="Qualified Leads" value={formatNumber(stats.qualifiedLeads)} icon={Award} tone="purple" />
        <MetricCard label="Conversions" value={formatNumber(stats.conversions)} icon={CheckCircle2} tone="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card padding="none">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Recent Campaigns</h3>
            <Link href="/campaigns" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt">
                <span className="text-sm text-ink truncate">{c.name}</span>
                <Badge status={c.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card padding="none">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Automation Activity</h3>
            <Link href="/automations" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {automations.map((a) => (
              <Link key={a.id} href={`/automations/${a.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt">
                <span className="text-sm text-ink truncate">{a.name}</span>
                <span className="text-xs text-ink-muted">{a.totalActive} active</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6" padding="none">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Top Segments</h3>
          <Link href="/segments" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3 p-5 pt-0">
          {topSegments.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3.5">
              <p className="text-sm font-medium text-ink truncate">{s.name}</p>
              <p className="text-lg font-semibold text-primary-active mt-1">{s.contactCount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
