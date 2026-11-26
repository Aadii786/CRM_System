// Date range shared by every dashboard and report (MIR-3.9). The range travels in the page address:
//   ?range=30d            a preset (7d, 30d, 90d, month, year, all)
//   ?from=2026-11-01&to=2026-11-30   a custom range (both ends optional)
// Pure functions only, so server pages, services and the client filter can all use them.

export const RANGE_PRESETS = [
  { key: "all", label: "All time" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom range" },
];

const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function startOfDay(d) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
function endOfDay(d) { return new Date(startOfDay(d).getTime() + DAY - 1); }
function parseDay(s) { return typeof s === "string" && ISO.test(s) ? new Date(`${s}T00:00:00.000Z`) : null; }
export function toIsoDay(d) { return d ? new Date(d).toISOString().slice(0, 10) : ""; }
function fmt(d) { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }); }

/** Turns page search params into { preset, from, to, label, active }. `from` / `to` are Dates or null. */
export function resolveRange(params = {}, now = new Date()) {
  const get = (k) => { const v = params[k]; return Array.isArray(v) ? v[0] : v; };
  const today = startOfDay(now);
  let preset = get("range");
  const fromParam = parseDay(get("from"));
  const toParam = parseDay(get("to"));
  if (!preset) preset = fromParam || toParam ? "custom" : "all";

  let from = null, to = null;
  if (preset === "7d") { from = new Date(today.getTime() - 6 * DAY); to = endOfDay(today); }
  else if (preset === "30d") { from = new Date(today.getTime() - 29 * DAY); to = endOfDay(today); }
  else if (preset === "90d") { from = new Date(today.getTime() - 89 * DAY); to = endOfDay(today); }
  else if (preset === "month") { from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); to = endOfDay(today); }
  else if (preset === "year") { from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1)); to = endOfDay(today); }
  else if (preset === "custom") { from = fromParam; to = toParam ? endOfDay(toParam) : null; }
  else preset = "all";

  if (from && to && from > to) { const t = from; from = startOfDay(to); to = endOfDay(t); } // a reversed custom range is swapped

  let label = "All time";
  if (from && to) label = `${fmt(from)} to ${fmt(to)}`;
  else if (from) label = `From ${fmt(from)}`;
  else if (to) label = `Until ${fmt(to)}`;
  if (preset !== "custom" && preset !== "all") label = RANGE_PRESETS.find((p) => p.key === preset)?.label || label;

  return { preset, from, to, label, active: Boolean(from || to) };
}

/** Query string for links and exports that must keep the range (no leading "?"). */
export function rangeQuery(range) {
  if (!range || !range.active) return "";
  if (range.preset !== "custom") return `range=${range.preset}`;
  const p = [];
  if (range.from) p.push(`from=${toIsoDay(range.from)}`);
  if (range.to) p.push(`to=${toIsoDay(range.to)}`);
  return p.join("&");
}

/** Date (YYYY-MM-DD) n days before today, counting today as day 1 (so 30 gives the "last 30 days" start). */
export function daysAgoIso(n) {
  return toIsoDay(new Date(Date.now() - (n - 1) * DAY));
}

/** Query string "createdFrom=...&createdTo=..." for a tile that opens the contacts created in the range (default: last 30 days). */
export function createdQuery(range) {
  if (range && range.active) return [range.from ? `createdFrom=${toIsoDay(range.from)}` : "", range.to ? `createdTo=${toIsoDay(range.to)}` : ""].filter(Boolean).join("&");
  return `createdFrom=${daysAgoIso(30)}`;
}
