import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getDepartmentDashboard } from "@/lib/services/reportingService";
import { listActivities } from "@/lib/services/activityService";
import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import {
  Users, UserPlus, Building2, Handshake, Award, TrendingUp,
  Megaphone, CheckSquare, AlertTriangle, CalendarDays,
} from "lucide-react";
import { formatNumber, formatCurrencyPKR, formatDateTime } from "@/lib/utils/format";
import { departmentTone } from "@/lib/constants/moduleColors";

export const metadata = { title: "Department Dashboard" };

export default async function DepartmentDashboardPage() {
  const user = await requireUserWithPermission("dashboard.view");
  const deptName = user.department?.name || "My Department";
  const tone = departmentTone(user.department?.key);

  const [stats, activitiesRaw] = await Promise.all([
    getDepartmentDashboard(user),
    listActivities(user, { limit: 8 }),
  ]);
  const activities = activitiesRaw.data.map((a) => a.get({ plain: true }));

  return (
    <div>
      <PageHeader title={`${deptName} Dashboard`} description={`Real-time overview of contacts, companies, deals and day-to-day work for ${deptName}.`} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
        <MetricCard label="Total Contacts" value={formatNumber(stats.totalContacts)} icon={Users} href="/contacts" tone={tone} />
        <MetricCard label="New (30 days)" value={formatNumber(stats.newContacts)} icon={UserPlus} tone={tone} />
        <MetricCard label="Companies" value={formatNumber(stats.companies)} icon={Building2} href="/companies" tone="cyan" />
        <MetricCard label="Open Deals" value={formatNumber(stats.openDeals)} icon={Handshake} href="/deals" tone="cyan" />
        <MetricCard label="Won Deals" value={formatNumber(stats.wonDeals)} icon={Award} tone="green" />
        <MetricCard label="Pipeline Value" value={formatCurrencyPKR(stats.pipelineValue)} icon={TrendingUp} tone="green" />
        <MetricCard label="Campaigns" value={formatNumber(stats.campaigns)} icon={Megaphone} href="/campaigns" tone="purple" />
        <MetricCard label="Open Tasks" value={formatNumber(stats.openTasks)} icon={CheckSquare} href="/tasks" tone="amber" />
        <MetricCard label="Overdue Tasks" value={formatNumber(stats.overdueTasks)} icon={AlertTriangle} tone="red" />
        <MetricCard label="Upcoming Meetings" value={formatNumber(stats.upcomingMeetings)} icon={CalendarDays} href="/meetings" tone="teal" />
      </div>

      <Card padding="none">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Recent Activity</h3>
          <Link href="/activities" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {activities.length === 0 ? (
          <div className="p-5 pt-0">
            <EmptyState tone={tone} title="No activity yet" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{a.title}</p>
                  <p className="text-xs text-ink-muted truncate">
                    {a.Contact && <Link href={`/contacts/${a.Contact.id}`} className="hover:text-primary">{a.Contact.firstName} {a.Contact.lastName}</Link>}
                    {a.Company && <Link href={`/companies/${a.Company.id}`} className="hover:text-primary">{a.Company.name}</Link>}
                    {a.Deal && <Link href={`/deals/${a.Deal.id}`} className="hover:text-primary">{a.Deal.name}</Link>}
                  </p>
                </div>
                <span className="text-xs text-ink-muted shrink-0">{formatDateTime(a.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
