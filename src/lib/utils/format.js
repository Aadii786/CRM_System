// Shared, dependency-free formatting helpers (Intl is native to Node/the
// browser, so there's no need for a date/number formatting package).

export function formatNumber(value) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrencyPKR(value) {
  if (value == null) return "-";
  const num = Number(value);
  if (num >= 1_000_000) return `PKR ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `PKR ${(num / 1_000).toFixed(0)}K`;
  return `PKR ${formatNumber(num)}`;
}

export function formatCurrencyFull(value) {
  if (value == null) return "-";
  return `PKR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatDate(value, opts = {}) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", ...opts }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function initialsOf(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function fullName(entity) {
  if (!entity) return "";
  return [entity.firstName, entity.lastName].filter(Boolean).join(" ");
}
