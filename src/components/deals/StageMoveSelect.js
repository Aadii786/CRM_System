"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveDealStageAction } from "@/actions/deals";
import { useToast } from "@/components/ui/Toast";

/** Move-stage dropdown (requirements #83): deliberately not drag-and-drop. */
export default function StageMoveSelect({ dealId, currentStageId, stages }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function handleChange(e) {
    const stageId = e.target.value;
    if (stageId === String(currentStageId)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("dealId", dealId);
      fd.set("stageId", stageId);
      await moveDealStageAction(fd);
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
      className="h-7 rounded-md border border-border-strong bg-surface px-1.5 text-xs font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
    >
      {stages.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
