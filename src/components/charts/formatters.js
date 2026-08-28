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
