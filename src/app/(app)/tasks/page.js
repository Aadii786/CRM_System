import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getTasks, getTaskStats } from "@/lib/services/taskService";
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

  const [{ data: tasksRaw }, stats] = await Promise.all([
    getTasks(user, { limit: 100, status: sp.status || undefined, priority: sp.priority || undefined }),
    getTaskStats(user),
  ]);
  const tasks = tasksRaw.map((t) => t.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Follow-ups, reminders and action items across Marketing and IKL/HSM."
        actions={hasPermission(user, "tasks.create") && <NewTaskButton />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Total</p><p className="text-lg font-semibold text-ink">{formatNumber(stats.total)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Pending</p><p className="text-lg font-semibold text-ink">{formatNumber(stats.pending)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Overdue</p><p className="text-lg font-semibold text-danger">{formatNumber(stats.overdue)}</p></Card>
        <Card padding="sm"><p className="text-xs text-ink-muted mb-1">Completed</p><p className="text-lg font-semibold text-success">{formatNumber(stats.completed)}</p></Card>
      </div>

      <FilterBar>
        <UrlSelect paramName="status" allLabel="All statuses" options={TASK_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        <UrlSelect paramName="priority" allLabel="All priorities" options={TASK_PRIORITIES.map((s) => ({ value: s, label: s }))} className="w-40" />
      </FilterBar>

      <TasksList tasks={tasks} canEdit={hasPermission(user, "tasks.update")} />
    </div>
  );
}
