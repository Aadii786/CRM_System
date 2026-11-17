import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getTasks, getTaskStats } from "@/lib/services/taskService";
import { getTeamFollowUps, canSeeTeamFollowUps } from "@/lib/services/reminderService";
import { formatDate } from "@/lib/utils/format";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import UrlSelect from "@/components/ui/UrlSelect";
import Card from "@/components/ui/Card";
import TasksList from "@/components/tasks/TasksList";
import NewTaskButton from "@/components/tasks/NewTaskButton";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants/crm";
import { formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }) {
  const user = await requireUserWithPermission("tasks.view");
  const sp = await searchParams;

  const [{ data: tasksRaw }, stats, team] = await Promise.all([
    getTasks(user, { limit: 100, status: sp.status || undefined, priority: sp.priority || undefined }),
    getTaskStats(user),
    canSeeTeamFollowUps(user) ? getTeamFollowUps(user) : Promise.resolve([]),
  ]);
  const tasks = tasksRaw.map((t) => t.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Follow-ups, reminders and action items across Marketing and IKL."
        actions={hasPermission(user, "tasks.create") && <NewTaskButton />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Total</p><p className="text-lg font-semibold text-ink">{formatNumber(stats.total)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Pending</p><p className="text-lg font-semibold text-ink">{formatNumber(stats.pending)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Overdue</p><p className="text-lg font-semibold text-danger">{formatNumber(stats.overdue)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Completed</p><p className="text-lg font-semibold text-success">{formatNumber(stats.completed)}</p></Card>
      </div>

      {team.length > 0 && (
        <Card padding="none" className="mb-5">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-ink">Team follow-ups</h3>
            <p className="text-xs text-ink-muted">Open follow-ups per person. Owners get a reminder 24 hours before a due date; you are told when one stays overdue for more than a day.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-muted">
                <tr>{["Person", "Open", "Due in 24 hours", "Overdue", "Oldest overdue"].map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((p) => (
                  <tr key={p.ownerId || "none"}>
                    <td className="px-4 py-2.5 font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">{p.open}</td>
                    <td className="px-4 py-2.5 tabular-nums">{p.dueSoon || "—"}</td>
                    <td className={["px-4 py-2.5 tabular-nums", p.overdue ? "text-danger font-medium" : ""].join(" ")}>{p.overdue || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{p.oldestOverdue ? `${p.oldestOverdue.title} (${formatDate(p.oldestOverdue.dueDate)})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <FilterBar>
        <UrlSelect paramName="status" allLabel="All statuses" options={TASK_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        <UrlSelect paramName="priority" allLabel="All priorities" options={TASK_PRIORITIES.map((s) => ({ value: s, label: s }))} className="w-40" />
      </FilterBar>

      <TasksList tasks={tasks} canEdit={hasPermission(user, "tasks.update")} />
    </div>
  );
}
