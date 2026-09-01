"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { CANVAS_WIDTH } from "@/lib/emailDesign/elements";

const DRAG_THRESHOLD = 3;

/** One placed block on the canvas - drag anywhere on it to move, drag the corner handle to resize, click to select. */
export default function CanvasElement({ element, selected, onSelect, onMove, onResize, onDelete }) {
  const dragRef = useRef(null);
  const { id, type, x, y, width, height, props } = element;

  function startMove(e) {
    e.stopPropagation();
    onSelect(id);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    dragRef.current = { startX: x, startY: y, moved: false };

    function onMouseMove(ev) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      if (!dragRef.current) return;
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD && !dragRef.current.moved) return;
      dragRef.current.moved = true;
      const nextX = Math.min(Math.max(0, dragRef.current.startX + dx), CANVAS_WIDTH - width);
      const nextY = Math.max(0, dragRef.current.startY + dy);
      onMove(id, nextX, nextY);
    }
    function onMouseUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function startResize(e) {
    e.stopPropagation();
    e.preventDefault();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startWidth = width;
    const startHeight = height;
    const resizeHeight = type === "text" || type === "image" || type === "spacer";

    function onMouseMove(ev) {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      const nextWidth = Math.min(Math.max(60, startWidth + dx), CANVAS_WIDTH - x);
      const patch = { width: nextWidth };
      if (resizeHeight) patch.height = Math.max(20, startHeight + dy);
      onResize(id, patch);
    }
    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div
      onMouseDown={startMove}
      className={[
        "absolute select-none",
        selected ? "outline outline-2 outline-primary outline-offset-2" : "hover:outline hover:outline-1 hover:outline-border-strong",
        "cursor-move",
      ].join(" ")}
      style={{ left: x, top: y, width, minHeight: height }}
    >
      <ElementContent type={type} props={props} height={height} />

      {selected && (
        <>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            title="Delete"
            className="absolute -top-3 -right-3 size-6 rounded-full bg-danger text-white flex items-center justify-center shadow-sm hover:brightness-95"
          >
            <X className="size-3.5" />
          </button>
          <div
            onMouseDown={startResize}
            title="Resize"
            className="absolute -bottom-1.5 -right-1.5 size-3.5 rounded-sm bg-primary cursor-nwse-resize"
          />
        </>
      )}
    </div>
  );
}

function ElementContent({ type, props, height }) {
  if (type === "text") {
    return (
      <div
        style={{ fontSize: props.fontSize, color: props.color, textAlign: props.align, fontWeight: props.bold ? 700 : 400 }}
        className="whitespace-pre-line leading-relaxed py-1"
      >
        {props.content || "(empty text)"}
      </div>
    );
  }
  if (type === "image") {
    return (
      <div style={{ textAlign: props.align, height }} className="flex items-center justify-center bg-surface-alt rounded-md overflow-hidden">
        {props.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.src} alt={props.alt || ""} className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-xs text-ink-muted px-2 text-center">No image URL set - open Property panel to add one</span>
        )}
      </div>
    );
  }
  if (type === "button") {
    return (
      <div style={{ textAlign: props.align }}>
        <span
          style={{ background: props.bgColor, color: props.textColor }}
          className="inline-block rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          {props.label || "Button"}
        </span>
      </div>
    );
  }
  if (type === "divider") {
    return <hr style={{ borderColor: props.color, borderTopWidth: Math.max(1, Math.round(height / 4)) }} className="border-0 border-t" />;
  }
  if (type === "spacer") {
    return (
      <div style={{ height }} className="rounded border border-dashed border-border flex items-center justify-center">
        <span className="text-[10px] text-ink-muted uppercase tracking-wide">Spacer</span>
      </div>
    );
  }
  return null;
}
