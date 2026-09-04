"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableDealCard from "./SortableDealCard";
import { formatCurrencyPKR } from "@/lib/utils/format";
import { getTone } from "@/lib/constants/moduleColors";

export default function PipelineColumn({ stage, tone = "neutral", deals, allStages, canDrag, onMoved }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage.id}`, data: { type: "column", stageId: stage.id } });
  const stageValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
  const { dot, bg, icon: countColor } = getTone(tone);

  return (
    <div className="flex flex-col w-72 shrink-0 h-full">
      <div className="flex items-center gap-2 px-1 mb-2 shrink-0">
        <span className={["size-2 rounded-full shrink-0", dot].join(" ")} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink truncate flex-1">{stage.name}</h3>
        <span className={["shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", bg, countColor].join(" ")}>{deals.length}</span>
      </div>
      <p className="px-1 text-xs text-ink-muted mb-2.5 shrink-0">{formatCurrencyPKR(stageValue)}</p>
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-2.5 flex-1 min-h-[80px] rounded-lg p-2 overflow-y-auto transition-colors border-t-2",
          isOver ? "bg-primary-subtle/60 ring-2 ring-primary-border" : "bg-surface-alt/60",
          getTone(tone).border,
        ].join(" ")}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-6">{isOver ? "Drop here" : "No deals"}</p>
          ) : (
            deals.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} tone={tone} stages={allStages} canDrag={canDrag} onMoved={onMoved} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
