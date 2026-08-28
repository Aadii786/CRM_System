import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Server-rendered, link-based pagination (no client JS needed) - every
// paginated table in the app is driven by a `page` search param so the
// URL is always the source of truth and results stay bookmarkable.
export default function Pagination({ page, totalPages, total, limit, buildHref }) {
  if (totalPages <= 1 && total <= limit) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const linkClasses = (disabled) =>
    [
      "inline-flex items-center justify-center size-8 rounded-md border text-sm transition-colors",
      disabled
        ? "border-border text-ink-muted pointer-events-none opacity-50"
        : "border-border-strong text-ink hover:bg-surface-alt",
    ].join(" ");

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 text-sm">
      <p className="text-ink-muted">
        Showing <span className="font-medium text-ink">{start.toLocaleString()}</span>-
        <span className="font-medium text-ink">{end.toLocaleString()}</span> of{" "}
        <span className="font-medium text-ink">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Link href={buildHref(page - 1)} aria-disabled={prevDisabled} className={linkClasses(prevDisabled)}>
          <ChevronLeft className="size-4" />
        </Link>
        <span className="px-2 text-ink-secondary">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Link href={buildHref(page + 1)} aria-disabled={nextDisabled} className={linkClasses(nextDisabled)}>
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
