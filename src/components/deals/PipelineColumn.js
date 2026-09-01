"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import SortableDealCard from "./SortableDealCard";
import { formatCurrencyPKR } from "@/lib/utils/format";

export default function PipelineColumn({ stage, deals, allStages, canDrag, onMoved }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage.id}`, data: { type: "column", stageId: stage.id } });
  const stageValue = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div className="flex flex-col w-72 shrink-0 h-full">
      <div className="flex items-center justify-between px-1 mb-2.5 shrink-0">
        <h3 className="text-sm font-semibold text-ink truncate">{stage.name}</h3>
        <span className="text-xs text-ink-muted shrink-0 ml-2">{deals.length}</span>
      </div>
      <p className="px-1 text-xs text-ink-muted mb-2.5 shrink-0">{formatCurrencyPKR(stageValue)}</p>
      <div
        ref={setNodeRef}
        className={[
          "flex flex-col gap-2.5 flex-1 min-h-[80px] rounded-lg p-2 overflow-y-auto transition-colors",
          isOver ? "bg-primary-subtle/60 ring-2 ring-primary-border" : "bg-surface-alt/60",
        ].join(" ")}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 ? (
            <p className="text-xs text-ink-muted text-center py-6">{isOver ? "Drop here" : "No deals"}</p>
          ) : (
            deals.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} stages={allStages} canDrag={canDrag} onMoved={onMoved} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
