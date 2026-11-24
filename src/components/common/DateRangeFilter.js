"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { RANGE_PRESETS } from "@/lib/utils/dateRange";

/**
 * Date range for a dashboard or report (MIR-3.9). It only changes the page address (?range=30d, or
 * ?from=...&to=...), so the server page recalculates and the range can be bookmarked or shared.
 */
export default function DateRangeFilter({ preset = "all", from = "", to = "", label }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(mutate) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onPreset(e) {
    const value = e.target.value;
    push((p) => {
      p.delete("from"); p.delete("to");
      if (value === "all") p.delete("range");
      else p.set("range", value);
    });
  }

  function onDate(name) {
    return (e) => push((p) => {
      p.delete("range");
      if (e.target.value) p.set(name, e.target.value); else p.delete(name);
    });
  }

  const input = "h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 mb-5" role="group" aria-label="Date range">
      <CalendarRange className="size-4 text-ink-muted" aria-hidden="true" />
      <select aria-label="Period" value={preset} onChange={onPreset} className={input}>
        {RANGE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted">From
        <input type="date" aria-label="From date" value={from} onChange={onDate("from")} className={input} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted">To
        <input type="date" aria-label="To date" value={to} onChange={onDate("to")} className={input} />
      </label>
      <span className="text-xs text-ink-muted ml-auto">Showing: <strong className="text-ink">{label}</strong></span>
    </div>
  );
}
