"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

/**
 * Debounced search box that writes to the `q` URL search param (requirements
 * #58/#15). Debouncing avoids firing a server request on every keystroke
 * against a 58,000+ row table.
 */
export default function SearchInput({ placeholder = "Search...", paramName = "q", debounceMs = 350 }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramValue = searchParams.get(paramName) || "";
  const [value, setValue] = useState(paramValue);
  const [syncedParam, setSyncedParam] = useState(paramValue);
  const [isPending, startTransition] = useTransition();
  const timer = useRef(null);

  // Keep the input in sync when the URL param changes from elsewhere (e.g.
  // a filter reset) - updating state during render (not in an effect) per
  // React's "adjusting state when a prop changes" pattern.
  if (paramValue !== syncedParam) {
    setSyncedParam(paramValue);
    setValue(paramValue);
  }

  function handleChange(e) {
    const next = e.target.value;
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (next) params.set(paramName, next);
      else params.delete(paramName);
      params.set("page", "1");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, debounceMs);
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-md border border-border-strong bg-surface pl-8 pr-8 text-sm placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
      {isPending && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-ink-muted" />}
    </div>
  );
}
