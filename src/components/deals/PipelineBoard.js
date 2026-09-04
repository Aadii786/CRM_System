"use client";

import { useState } from "react";
import {
  DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import PipelineColumn from "./PipelineColumn";
import { moveDealStageAction } from "@/actions/deals";
import { useToast } from "@/components/ui/Toast";
import { stageTone } from "@/lib/constants/moduleColors";

/**
 * Kanban board with real drag-and-drop (dnd-kit - a few KB, no heavy DnD
 * framework) plus the per-card stage dropdown as a fallback for keyboard/
 * touch precision. Fixed board height + independent per-column vertical
 * scroll keeps the horizontal scrollbar reachable near the top of the
 * board instead of pushed to the bottom of whichever column has the most
 * cards.
 */
export default function PipelineBoard({ pipeline, byStage, canDrag }) {
  const [columns, setColumns] = useState(byStage);
  const [syncedProp, setSyncedProp] = useState(byStage);
  const { push } = useToast();
  const router = useRouter();

  // Re-sync local (optimistic) state whenever the server sends fresh props,
  // e.g. after router.refresh() following a move - computed during render
  // rather than in an effect, per React's "adjusting state when a prop
  // changes" pattern.
  if (byStage !== syncedProp) {
    setSyncedProp(byStage);
    setColumns(byStage);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function findStageIdForDeal(dealId) {
    for (const stage of pipeline.stages) {
      if ((columns[stage.id] || []).some((d) => d.id === dealId)) return stage.id;
    }
    return null;
  }

  /** Pure local (optimistic) state update - no server call. */
  function applyLocalMove(dealId, fromStageId, toStageId) {
    if (fromStageId === toStageId) return;
    setColumns((prev) => {
      const deal = (prev[fromStageId] || []).find((d) => d.id === dealId);
      if (!deal) return prev;
      return {
        ...prev,
        [fromStageId]: prev[fromStageId].filter((d) => d.id !== dealId),
        [toStageId]: [{ ...deal, stageId: toStageId }, ...(prev[toStageId] || [])],
      };
    });
  }

  // Used by the stage <select> dropdown: it already makes its own server
  // call (with its own toast + refresh), this only keeps the board's local
  // state in sync so the card visibly jumps columns immediately.
  function handleDropdownMove(dealId, toStageId) {
    const fromStageId = findStageIdForDeal(dealId);
    if (fromStageId) applyLocalMove(dealId, fromStageId, toStageId);
  }

  // Used by drag-and-drop: applies the optimistic update AND makes the
  // actual server call, since there's no <select> already doing that here.
  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || !canDrag) return;

    const dealId = Number(active.id);
    const fromStageId = findStageIdForDeal(dealId);

    let toStageId;
    if (String(over.id).startsWith("column-")) {
      toStageId = Number(String(over.id).replace("column-", ""));
    } else {
      toStageId = findStageIdForDeal(Number(over.id));
    }

    if (!fromStageId || !toStageId || fromStageId === toStageId) return;

    applyLocalMove(dealId, fromStageId, toStageId);

    const stageName = pipeline.stages.find((s) => s.id === toStageId)?.name;
    const fd = new FormData();
    fd.set("dealId", dealId);
    fd.set("stageId", toStageId);
    moveDealStageAction(fd).then((result) => {
      if (result?.error) {
        applyLocalMove(dealId, toStageId, fromStageId); // revert the drag
        push(result.error, { type: "error" });
        return;
      }
      push(`Deal moved to ${stageName}.`);
      router.refresh();
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-[70vh] min-h-[420px] flex gap-4 overflow-x-auto pb-3 -mx-1 px-1">
        {pipeline.stages.map((stage, i) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            tone={stageTone(stage, i)}
            deals={columns[stage.id] || []}
            allStages={pipeline.stages}
            canDrag={canDrag}
            onMoved={handleDropdownMove}
          />
        ))}
      </div>
    </DndContext>
  );
}
