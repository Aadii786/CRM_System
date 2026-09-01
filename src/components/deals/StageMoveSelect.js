"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveDealStageAction } from "@/actions/deals";
import { useToast } from "@/components/ui/Toast";

/**
 * Move-stage dropdown - kept alongside drag-and-drop as the keyboard/touch
 * -accessible way to change a deal's stage (requirements #83 originally
 * asked for this instead of drag-and-drop; the board now supports both).
 * `onMoved` lets an ancestor Kanban board update its own optimistic state
 * immediately, the same way a drag-and-drop move does.
 */
export default function StageMoveSelect({ dealId, currentStageId, stages, onMoved }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function handleChange(e) {
    const stageId = e.target.value;
    if (stageId === String(currentStageId)) return;
    const previousStageId = currentStageId;
    onMoved?.(dealId, Number(stageId));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("dealId", dealId);
      fd.set("stageId", stageId);
      const result = await moveDealStageAction(fd);
      if (result?.error) {
        onMoved?.(dealId, previousStageId); // revert the optimistic move
        push(result.error, { type: "error" });
        return;
      }
      const stageName = stages.find((s) => String(s.id) === stageId)?.name;
      push(`Deal moved to ${stageName}.`);
      router.refresh();
    });
  }

  return (
    <select
      value={currentStageId}
      onChange={handleChange}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="h-7 rounded-md border border-border-strong bg-surface px-1.5 text-xs font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
