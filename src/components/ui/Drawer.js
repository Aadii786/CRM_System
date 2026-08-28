"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Right-hand slide-in drawer used for quick record views (requirements
 * #94: quick contact/company/deal view without leaving the current page).
 */
export default function Drawer({ open, onClose, title, children, footer, width = "max-w-md" }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={["relative h-full w-full bg-surface shadow-lg flex flex-col animate-fade-in", width].join(" ")}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink focus-ring"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
