"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Accessible modal dialog (requirements #56, #75): traps focus inside the
 * native <dialog>, closes on Escape/backdrop click, and restores focus to
 * the trigger on close.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose?.();
      }}
      className={[
        // Native <dialog> centers itself via the UA stylesheet's
        // `margin: auto`, but Tailwind's preflight resets margin to 0 on
        // every element - which silently overrides that and left the
        // dialog pinned to its default top-left position. Setting these
        // explicitly (rather than relying on the browser default) keeps it
        // centered regardless of the reset.
        "fixed inset-0 m-auto max-h-[90vh] overflow-hidden",
        "w-full rounded-lg border border-border bg-surface p-0 shadow-lg backdrop:bg-black/40",
        widths[size],
      ].join(" ")}
    >
      {open && (
        <div className="animate-fade-in">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              {description && <p className="text-sm text-ink-muted mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-md p-1.5 text-ink-muted hover:bg-surface-alt hover:text-ink focus-ring"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
