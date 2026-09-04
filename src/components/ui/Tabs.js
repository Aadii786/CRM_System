"use client";

import { useState } from "react";

/**
 * `children` must be an array of plain elements in the same order as
 * `tabs` (not a render-prop function) - Tabs is a Client Component, and a
 * Server Component caller can't pass it a function as a prop (React's RSC
 * boundary only allows serializable values across it). All panels are
 * rendered up front; only the active one is shown, toggled client-side via
 * the `hidden` attribute so no data re-fetch is needed on tab switch.
 */
export default function Tabs({ tabs, defaultTab, children }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  const panels = Array.isArray(children) ? children : [children];

  return (
    <div>
      <div role="tablist" className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={[
                "relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded-t-md",
                isActive ? "text-primary-active bg-primary-subtle/60" : "text-ink-muted hover:text-ink hover:bg-surface-alt",
              ].join(" ")}
            >
              {tab.label}
              {tab.count != null && (
                <span className={["ml-1.5 text-xs", isActive ? "text-primary" : "text-ink-muted"].join(" ")}>({tab.count})</span>
              )}
              {isActive && <span className="absolute left-0 right-0 -bottom-px h-[2.5px] bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.key} hidden={tab.key !== active} className="animate-fade-in">
          {panels[i]}
        </div>
      ))}
    </div>
  );
}
