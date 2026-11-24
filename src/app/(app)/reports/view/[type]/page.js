import { notFound } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { runReport, canExportReports, reportsFor } from "@/lib/services/reportService";
import { resolveRange, rangeQuery, toIsoDay } from "@/lib/utils/dateRange";
import { formatNumber, formatCurrencyPKR, formatPercent } from "@/lib/utils/format";
import PageHeader from "@/components/common/PageHeader";
import DateRangeFilter from "@/components/common/DateRangeFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";

export async function generateMetadata({ params }) {
  const { type } = await params;
  return { title: `Report: ${type}` };
}

function show(c, v) {
  if (v === null || v === undefined || v === "") return "";
  if (c.type === "currency") return formatCurrencyPKR(v);
  if (c.type === "number") return formatNumber(v);
  if (c.type === "decimal") return Number(v).toFixed(2);
  if (c.type === "percent") return formatPercent(v);
  return String(v);
}

export default async function ReportViewPage({ params, searchParams }) {
  const user = await requireUserWithPermission("reports.view");
  const { type } = await params;
  const range = resolveRange(await searchParams);
  if (!reportsFor(user).some((r) => r.key === type)) notFound();
  const report = await runReport(user, type, range);
  const canExport = canExportReports(user);
  const qs = rangeQuery(range);
  const exportHref = (format) => `/api/reports/${type}?format=${format}${qs ? `&${qs}` : ""}`;
  const right = (c) => c.type !== "text" && c.type !== "date";

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: report.title }]}
        title={report.title}
        description={report.description}
        actions={canExport ? (
          <>
            <Button href={exportHref("xlsx")} variant="secondary" icon={Download}>Excel</Button>
            <Button href={exportHref("pdf")} variant="secondary" icon={FileText}>PDF</Button>
          </>
        ) : null}
      />
      <DateRangeFilter preset={range.preset} from={toIsoDay(range.from)} to={toIsoDay(range.to)} label={range.label} />

      {report.summary.length > 0 && (
        <div className="flex flex-wrap gap-6 mb-4">
          {report.summary.map((s) => (
            <div key={s.label}><div className="text-xs text-ink-muted">{s.label}</div><div className="text-lg font-semibold text-ink tabular-nums">{show({ type: s.type }, s.value)}</div></div>
          ))}
        </div>
      )}

      <Card padding="none">
        {report.rows.length === 0 ? (
          <EmptyState title="No records for this period" description="Try a wider date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left text-xs font-semibold text-ink-secondary">
                  {report.columns.map((c) => <th key={c.key} className={["px-3 py-2.5 align-bottom", right(c) ? "text-right" : ""].join(" ")}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-alt/60">
                    {report.columns.map((c, ci) => <td key={c.key} className={["px-3 py-2", right(c) ? "text-right tabular-nums" : "", ci === 0 ? "font-medium text-ink" : "text-ink-secondary"].join(" ")}>{show(c, r[c.key])}</td>)}
                  </tr>
                ))}
              </tbody>
              {report.totals && (
                <tfoot>
                  <tr className="border-t-2 border-border-strong bg-surface-alt font-semibold text-ink">
                    {report.columns.map((c, ci) => <td key={c.key} className={["px-3 py-2.5", right(c) ? "text-right tabular-nums" : ""].join(" ")}>{ci === 0 ? "Total" : report.totals[c.key] === undefined ? "" : show(c, report.totals[c.key])}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
      {report.notes.length > 0 && <ul className="mt-3 text-xs text-ink-muted list-disc pl-5 space-y-0.5">{report.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {!canExport && <p className="mt-3 text-xs text-ink-muted">Exporting to Excel or PDF is available to the Head of Department and Marketing.</p>}
    </div>
  );
}
