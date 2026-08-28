"use client";

import Link from "next/link";
import { useTransition } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { updateMeetingStatusAction } from "@/actions/meetings";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils/format";

export default function MeetingsList({ meetings, showComplete }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  if (meetings.length === 0) {
    return <EmptyState title="No meetings" description="Meetings will appear here once scheduled." />;
  }

  function complete(id) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("status", "Completed");
      await updateMeetingStatusAction(fd);
      push("Meeting marked completed.");
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {meetings.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{m.title}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {formatDateTime(m.startAt)}
              {m.location && <span className="inline-flex items-center gap-1 ml-2"><MapPin className="size-3" />{m.location}</span>}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              {m.Contact && <Link href={`/contacts/${m.Contact.id}`} className="hover:text-primary">{m.Contact.firstName} {m.Contact.lastName}</Link>}
              {m.Company && <Link href={`/companies/${m.Company.id}`} className="hover:text-primary ml-1">{m.Company.name}</Link>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge status={m.status} />
            {showComplete && m.status === "Scheduled" && (
              <Button variant="secondary" size="sm" icon={CheckCircle2} loading={isPending} onClick={() => complete(m.id)}>
                Complete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
