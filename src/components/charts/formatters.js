import { formatNumber, formatCurrencyPKR, formatPercent } from "@/lib/utils/format";

// Chart components are Client Components; a Server Component page can't
// pass a plain function (e.g. formatNumber) to them as a prop - React's
// RSC boundary only allows serializable values across it. So callers pass
// a format *name* (a plain string) and each chart resolves the actual
// function locally, in client code, via this map.
const FORMATTERS = {
  number: formatNumber,
  currency: formatCurrencyPKR,
  percent: (v) => formatPercent(v, 0),
};

export function resolveFormatter(format) {
  return FORMATTERS[format] || ((v) => v);
}

// One shared, ordered color sequence for every multi-series chart in the
// app (requirements #19: consistent chart colors, used only where they
// represent different meanings) - pulls from the same module-color CSS
// variables the sidebar/badges/KPI tiles use (globals.css), so a chart
// legend reads as part of the same system instead of its own palette.
export const CHART_PALETTE = [
  "var(--color-blue)",
  "var(--color-purple)",
  "var(--color-cyan)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-teal)",
  "var(--color-rose)",
  "var(--color-primary)",
];
