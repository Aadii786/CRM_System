import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import {
  getUniversityOverview, getDepartmentComparison, getLeadsOverTime,
  getRevenueOverTime, getConversionFunnel,
} from "@/lib/services/reportingService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import ChartCard from "@/components/ui/ChartCard";
import Card from "@/components/ui/Card";
import UrlSelect from "@/components/ui/UrlSelect";
import TrendLineChart from "@/components/charts/TrendLineChart";
import ComparisonBarChart from "@/components/charts/ComparisonBarChart";
import FunnelBars from "@/components/charts/FunnelBars";
import {
  Users, UserPlus, Award, Handshake, TrendingUp, Megaphone, Mail, Eye,
  MousePointerClick, Activity, MessageCircle, Briefcase, FileText,
  CheckCircle2, GraduationCap, Wallet, Clock, School,
} from "lucide-react";
import { formatNumber, formatPercent, formatCurrencyPKR } from "@/lib/utils/format";

export const metadata = { title: "Executive Dashboard" };

const RANGE_TO_MONTHS = { "30d": 1, "90d": 3, "6m": 6, "1y": 12 };

export default async function ExecutiveDashboardPage({ searchParams }) {
  const user = await requireUserWithPermission("executive.dashboard.view");
  const sp = await searchParams;
  const months = RANGE_TO_MONTHS[sp.range] || 6;

  const [overview, deptComparison, leadsOverTime, revenueOverTime, funnel] = await Promise.all([
    getUniversityOverview(user),
    getDepartmentComparison(),
    getLeadsOverTime(months),
    getRevenueOverTime(months),
    getConversionFunnel(),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];

  const comparisonData = [
    { label: "Contacts", Marketing: deptComparison.marketing.contacts, "IKL": deptComparison.ikl.contacts },
    { label: "New Leads", Marketing: deptComparison.marketing.newLeads, "IKL": deptComparison.ikl.newLeads },
    { label: "Qualified", Marketing: deptComparison.marketing.qualified, "IKL": deptComparison.ikl.qualified },
    { label: "Conversions", Marketing: deptComparison.marketing.conversions, "IKL": deptComparison.ikl.conversions },
  ];

  return (
    <div>
      <PageHeader
        title="University Overview"
        description={`${greeting}, ${firstName}. Consolidated performance across every department.`}
        actions={
          <UrlSelect
            paramName="range"
            allLabel="Last 6 months"
            options={[
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
              { value: "1y", label: "Last 12 months" },
            ]}
            className="w-44"
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3.5 mb-6">
        <MetricCard label="Total Contacts" value={formatNumber(overview.totalContacts)} icon={Users} href="/contacts" tone="blue" />
        <MetricCard label="New Leads" value={formatNumber(overview.newLeads)} icon={UserPlus} tone="blue" />
        <MetricCard label="Qualified Leads" value={formatNumber(overview.qualifiedLeads)} icon={Award} tone="purple" />
        <MetricCard label="Active Opportunities" value={formatNumber(overview.activeDeals)} icon={Handshake} href="/deals" tone="cyan" />
        <MetricCard label="Conversion Rate" value={formatPercent(overview.conversionRate)} icon={TrendingUp} tone="green" />
        <MetricCard label="Campaigns" value={formatNumber(overview.campaigns)} icon={Megaphone} href="/campaigns" tone="purple" />
        <MetricCard label="Emails Sent" value={formatNumber(overview.emailsSent)} icon={Mail} tone="purple" />
        <MetricCard label="Open Rate" value={formatPercent(overview.openRate)} icon={Eye} tone="green" />
        <MetricCard label="Click Rate" value={formatPercent(overview.clickRate)} icon={MousePointerClick} tone="green" />
        <MetricCard label="Engagement Rate" value={formatPercent(overview.engagementRate)} icon={Activity} tone="green" />
        <MetricCard label="WhatsApp Activity" value={formatNumber(overview.whatsappActivity)} icon={MessageCircle} href="/conversations" tone="teal" />
        <MetricCard label="B2B Opportunities" value={formatNumber(overview.b2bOpportunities)} icon={Briefcase} href="/deals" tone="cyan" />
        <MetricCard label="Proposals" value={formatNumber(overview.proposals)} icon={FileText} tone="amber" />
        <MetricCard label="Accepted Proposals" value={formatNumber(overview.acceptedProposals)} icon={CheckCircle2} tone="green" />
        <MetricCard label="Training Programs" value={formatNumber(overview.trainingPrograms)} icon={GraduationCap} tone="cyan" />
        <MetricCard label="Revenue" value={formatCurrencyPKR(overview.revenue)} icon={Wallet} href="/reports/revenue" tone="green" />
        <MetricCard label="Pending Payments" value={formatCurrencyPKR(overview.pendingPayments)} icon={Clock} tone="amber" />
        <MetricCard label="Completed Programs" value={formatNumber(overview.completedPrograms)} icon={School} tone="indigo" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="New Leads Over Time" description="Marketing contacts created per month.">
          <TrendLineChart data={leadsOverTime} series={[{ key: "value", name: "New Leads" }]} format="number" />
        </ChartCard>
        <ChartCard title="Revenue Over Time" description="Payments received across all IKL invoices.">
          <TrendLineChart data={revenueOverTime} series={[{ key: "value", name: "Revenue" }]} format="currency" />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Department Comparison" description="Marketing vs. IKL across shared metrics.">
          <ComparisonBarChart data={comparisonData} series={[{ key: "Marketing", name: "Marketing" }, { key: "IKL", name: "IKL" }]} format="number" />
        </ChartCard>
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-1">Conversion Funnel</h3>
          <p className="text-xs text-ink-muted mb-4">Marketing contacts moving from first touch to conversion.</p>
          <FunnelBars stages={funnel} />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink">Department Performance</h3>
          <Link href="/reports/department-performance" className="text-sm text-primary hover:underline">View full comparison</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="text-left font-medium py-2">Metric</th>
                <th className="text-right font-medium py-2">Marketing</th>
                <th className="text-right font-medium py-2">IKL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <ComparisonRow label="Contacts" a={deptComparison.marketing.contacts} b={deptComparison.ikl.contacts} />
              <ComparisonRow label="New Leads" a={deptComparison.marketing.newLeads} b={deptComparison.ikl.newLeads} />
              <ComparisonRow label="Qualified" a={deptComparison.marketing.qualified} b={deptComparison.ikl.qualified} />
              <ComparisonRow label="Conversions" a={deptComparison.marketing.conversions} b={deptComparison.ikl.conversions} />
              <ComparisonRow label="Active Deals" a={deptComparison.marketing.activeDeals} b={deptComparison.ikl.activeDeals} />
              <ComparisonRow label="Revenue" a={deptComparison.marketing.revenue} b={deptComparison.ikl.revenue} currency />
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ComparisonRow({ label, a, b, currency }) {
  const fmt = (v) => (v == null ? "—" : currency ? formatCurrencyPKR(v) : formatNumber(v));
  return (
    <tr>
      <td className="py-2.5 text-ink-secondary">{label}</td>
      <td className="py-2.5 text-right font-medium text-ink tabular-nums">{fmt(a)}</td>
      <td className="py-2.5 text-right font-medium text-ink tabular-nums">{fmt(b)}</td>
    </tr>
  );
}
