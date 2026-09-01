"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { updateTaskStatusAction } from "@/actions/tasks";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

export default function TasksList({ tasks, canEdit }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  if (tasks.length === 0) {
    return <EmptyState title="No tasks found" description="Tasks you create or that are assigned to you will appear here." />;
  }

  function toggleComplete(task) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", task.id);
      fd.set("status", task.status === "Completed" ? "Pending" : "Completed");
      await updateTaskStatusAction(fd);
      push(task.status === "Completed" ? "Task reopened." : "Task completed.");
      // revalidatePath() inside the server action invalidates the cache,
      // but only a form bound directly to a "use server" action gets the
      // resulting UI refresh automatically - an imperative call like this
      // one needs an explicit router.refresh() to actually re-render with
      // the new data (requirements #61: every interactive action must
      // visibly do something).
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => canEdit && toggleComplete(task)}
            disabled={!canEdit || isPending}
            aria-label={task.status === "Completed" ? "Mark as pending" : "Mark as completed"}
            className="shrink-0"
          >
            {task.status === "Completed" ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : (
              <Circle className="size-5 text-ink-muted hover:text-primary" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={["text-sm font-medium truncate", task.status === "Completed" ? "text-ink-muted line-through" : "text-ink"].join(" ")}>
              {task.title}
            </p>
            <p className="text-xs text-ink-muted truncate">
              {task.Contact && <Link href={`/contacts/${task.Contact.id}`} className="hover:text-primary">{task.Contact.firstName} {task.Contact.lastName}</Link>}
              {task.Company && <Link href={`/companies/${task.Company.id}`} className="hover:text-primary">{task.Company.name}</Link>}
              {task.Deal && <Link href={`/deals/${task.Deal.id}`} className="hover:text-primary">{task.Deal.name}</Link>}
            </p>
          </div>
          <Badge tone={task.priority === "Urgent" ? "danger" : task.priority === "High" ? "warning" : "neutral"}>{task.priority}</Badge>
          <Badge status={task.status} />
          <span className="text-xs text-ink-muted w-20 text-right shrink-0">{formatDate(task.dueDate)}</span>
        </div>
      ))}
    </div>
  );
}
