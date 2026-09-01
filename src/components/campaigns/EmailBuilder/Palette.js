"use client";

import { Type, Image as ImageIcon, MousePointerClick, Minus, MoveVertical } from "lucide-react";
import { ELEMENT_LABELS } from "@/lib/emailDesign/elements";

const ITEMS = [
  { type: "text", icon: Type },
  { type: "image", icon: ImageIcon },
  { type: "button", icon: MousePointerClick },
  { type: "divider", icon: Minus },
  { type: "spacer", icon: MoveVertical },
];

/**
 * Drag a block onto the canvas to place it exactly where you drop it, or
 * just click one to drop it near the bottom of the current content.
 */
export default function Palette({ onAdd }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(({ type, icon: Icon }) => (
        <button
          key={type}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-email-element", type);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onAdd(type)}
          title={`Drag onto the canvas, or click to add ${ELEMENT_LABELS[type]}`}
          className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-ink-secondary cursor-grab active:cursor-grabbing hover:bg-surface-alt hover:text-ink transition-colors"
        >
          <Icon className="size-4" />
          {ELEMENT_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
