"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "./Field";

/** A <select> that drives a URL search param directly - used for every list filter. */
export default function UrlSelect({ paramName, options, allLabel = "All", className = "" }) {
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
    <Select value={value} onChange={handleChange} className={className}>
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
