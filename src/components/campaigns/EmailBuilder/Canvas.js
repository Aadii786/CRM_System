"use client";

import { useRef } from "react";
import { CANVAS_WIDTH } from "@/lib/emailDesign/elements";
import CanvasElement from "./CanvasElement";

/** The email artboard - a fixed-width, freely-growing surface elements are dropped/dragged onto. */
export default function Canvas({ elements, selectedId, onSelect, onMove, onResize, onDelete, onDropNew }) {
  const canvasRef = useRef(null);

  const maxBottom = elements.reduce((max, el) => Math.max(max, el.y + (el.height || 0)), 0);
  const canvasHeight = Math.max(500, maxBottom + 120);

  function handleDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-email-element");
    if (!type || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onDropNew(type, e.clientX - rect.left, e.clientY - rect.top);
  }

  return (
    <div className="overflow-auto rounded-md border border-border bg-surface-alt p-6 flex-1">
      <div
        ref={canvasRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
        onMouseDown={() => onSelect(null)}
        style={{
          width: CANVAS_WIDTH,
          height: canvasHeight,
          backgroundImage: "radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        className="relative bg-surface rounded-md shadow-sm mx-auto"
      >
        {elements.length === 0 && (
          <p className="absolute inset-x-0 top-8 text-center text-sm text-ink-muted pointer-events-none">
            Drag a block from above onto this canvas to get started.
          </p>
        )}
        {elements.map((el) => (
          <CanvasElement
            key={el.id}
            element={el}
            selected={el.id === selectedId}
            onSelect={onSelect}
            onMove={onMove}
            onResize={onResize}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
