"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** A date field that drives a URL search param, same idea as UrlSelect. */
export default function UrlDateInput({ paramName, label, className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) || "";

  function handleChange(e) {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) params.set(paramName, e.target.value);
    else params.delete(paramName);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className={["flex items-center gap-1.5 text-xs text-ink-muted", className].join(" ")}>
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="date"
        value={value}
        onChange={handleChange}
        aria-label={label}
        className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      />
    </label>
  );
}
