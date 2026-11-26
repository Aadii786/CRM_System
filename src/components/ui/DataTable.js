import Link from "next/link";
import EmptyState from "./EmptyState";

/**
 * Plain, server-renderable data table used across Contacts/Companies/Deals/
 * Tasks/etc lists (requirements #57). Sorting/filtering/pagination are
 * driven by URL search params and handled by the page/service layer, so
 * this component stays a dumb, fast render of whatever rows it's given.
 *
 * columns: [{ key, header, className, render?(row) }]
 */
export default function DataTable({ columns, rows, keyField = "id", emptyState, footer, sort, dir, sortHref }) {
  if (!rows || rows.length === 0) {
    return emptyState || <EmptyState title="No records found" description="Try adjusting your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm table-sticky-header">
        <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={["px-4 py-2.5 text-left font-medium border-b border-border", col.className || ""].join(" ")}>
                {col.sortKey && sortHref ? (
                  <Link href={sortHref(col.sortKey)} className="inline-flex items-center gap-1 hover:text-ink" aria-label={`Sort by ${col.header}`}>
                    {col.header}
                    <span aria-hidden="true" className={sort === col.sortKey ? "text-primary" : "opacity-40"}>{sort === col.sortKey ? (dir === "asc" ? "\u25B2" : "\u25BC") : "\u2195"}</span>
                  </Link>
                ) : col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row[keyField]} className="bg-surface hover:bg-surface-alt transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={["px-4 py-3 align-middle text-ink", col.className || ""].join(" ")}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
