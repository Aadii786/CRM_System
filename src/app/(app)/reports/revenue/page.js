import DateRangeFilter from "@/components/common/DateRangeFilter";
import { resolveRange, toIsoDay, rangeQuery } from "@/lib/utils/dateRange";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getRevenueDashboard, getRevenueOverTime } from "@/lib/services/reportingService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import ChartCard from "@/components/ui/ChartCard";
import Card from "@/components/ui/Card";
import TrendLineChart from "@/components/charts/TrendLineChart";
import DonutChart from "@/components/charts/DonutChart";
import { Wallet, Trophy, Clock, TrendingUp, Handshake, Percent } from "lucide-react";
import { formatCurrencyPKR, formatPercent } from "@/lib/utils/format";

export const metadata = { title: "Revenue Report" };

export default async function RevenueReportPage({ searchParams }) {
  const user = await requireUserWithPermission("reports.view");
  const range = resolveRange(await searchParams);
  const [revenue, revenueOverTime] = await Promise.all([getRevenueDashboard(user, range), getRevenueOverTime(6, user)]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Revenue" }]}
        title="Revenue Report"
        description="Pipeline value, won revenue and payments received for your department."
      />
      <DateRangeFilter preset={range.preset} from={toIsoDay(range.from)} to={toIsoDay(range.to)} label={range.label} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
        <MetricCard label="Total Pipeline Value" value={formatCurrencyPKR(revenue.pipelineValue)} icon={Handshake} href="/deals?status=open" />
        <MetricCard label="Won Value" value={formatCurrencyPKR(revenue.wonValue)} icon={Trophy} href="/deals?status=won" />
        <MetricCard label="Pending Payments" value={formatCurrencyPKR(revenue.pendingPayments)} icon={Clock} href="/reports/view/revenue" />
        <MetricCard label="Paid Revenue" value={formatCurrencyPKR(revenue.paidRevenue)} icon={Wallet} href="/reports/view/revenue" />
        <MetricCard label="Average Deal Size" value={formatCurrencyPKR(revenue.averageDealSize)} icon={TrendingUp} href="/deals?status=won" />
        <MetricCard label="Conversion Rate" value={formatPercent(revenue.conversionRate)} icon={Percent} href="/deals" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Revenue by Month" description="Payments received, last 6 months.">
          <TrendLineChart data={revenueOverTime} series={[{ key: "value", name: "Revenue" }]} format="currency" />
        </ChartCard>
        <ChartCard title="Revenue by Training Type">
          <DonutChart data={revenue.byTrainingType.map((r) => ({ name: r.label, value: r.value }))} format="currency" />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4">Revenue by Company</h3>
          <RankedList items={revenue.byCompany} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4">Revenue by Owner</h3>
          <RankedList items={revenue.byOwner} />
        </Card>
      </div>
    </div>
  );
}

function RankedList({ items }) {
  if (!items || items.length === 0) return <p className="text-sm text-ink-muted">No won deals yet.</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ink truncate">{item.label}</span>
            <span className="text-ink-secondary tabular-nums">{formatCurrencyPKR(item.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-alt overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.value / max) * 100, 3)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
