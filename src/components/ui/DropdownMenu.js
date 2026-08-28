"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimal, dependency-free dropdown menu (user menu, row actions, quick
 * create). Closes on outside click and Escape; each item is a real button
 * or link so nothing here is a decorative dead-end control.
 */
export default function DropdownMenu({ trigger, children, align = "right", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          role="menu"
          className={[
            "absolute z-40 mt-1.5 min-w-[200px] rounded-lg border border-border bg-surface p-1.5 shadow-lg animate-fade-in",
            align === "right" ? "right-0" : "left-0",
            className,
          ].join(" ")}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ as, icon: Icon, danger, className = "", children, ...props }) {
  const Component = as || "button";
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      role="menuitem"
      className={[
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:pointer-events-none",
        danger ? "text-danger hover:bg-danger-subtle" : "text-ink hover:bg-surface-alt",
        className,
      ].join(" ")}
      {...props}
    >
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {children}
    </Component>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
