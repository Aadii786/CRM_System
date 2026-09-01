"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Filter, Trash2, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SegmentBuilder from "./SegmentBuilder";
import { deleteSegmentAction } from "@/actions/segments";
import { useToast } from "@/components/ui/Toast";

export default function SegmentsPageClient({ segments, departmentKey, canManage }) {
  const [open, setOpen] = useState(false);
  const { push } = useToast();
  const router = useRouter();

  return (
    <div>
      <div className="flex justify-end mb-4">
        {canManage && (
          <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>
            New Segment
          </Button>
        )}
      </div>

      {segments.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No segments found"
          description="Create your first segment to start targeting specific groups of contacts."
          action={canManage && <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New Segment</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-ink">{s.name}</h3>
                {canManage && (
                  <form
                    action={async (fd) => {
                      await deleteSegmentAction(fd);
                      push(`Segment "${s.name}" deleted.`);
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" aria-label={`Delete ${s.name}`} className="text-ink-muted hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                )}
              </div>
              {s.description && <p className="text-xs text-ink-muted mb-3">{s.description}</p>}
              <div className="flex items-center gap-1.5 text-sm font-medium text-primary-active">
                <Users className="size-4" />
                {s.contactCount.toLocaleString()} contacts
              </div>
              {s.conditions?.length > 0 && (
                <p className="text-xs text-ink-muted mt-2 line-clamp-2">
                  {s.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <SegmentBuilder open={open} onClose={() => setOpen(false)} departmentKey={departmentKey} />
    </div>
  );
}
