"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import DealCard from "./DealCard";

/**
 * Wraps DealCard with dnd-kit's sortable behavior. The grip icon is the
 * explicit drag handle (listeners are scoped to it, not the whole card) so
 * the card's own Link (open deal) and stage <select> keep working normally
 * for plain clicks - only a deliberate grab-and-move on the handle starts
 * a drag.
 */
export default function SortableDealCard({ deal, tone, stages, canDrag, onMoved }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: "deal", stageId: deal.stageId },
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {canDrag && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to move "${deal.name}"`}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex size-5 items-center justify-center rounded text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-surface-alt cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <DealCard deal={deal} tone={tone} stages={stages} onMoved={onMoved} canMove={canDrag} indent={canDrag} />
    </div>
  );
}
