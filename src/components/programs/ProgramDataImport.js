"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileCheck, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

/** Check first (nothing is saved), then import. The same code runs both times, so the check shows exactly what will happen. */
export default function ProgramDataImport() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(null); // "check" | "import"
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { push } = useToast();
  const router = useRouter();

  async function run(mode) {
    if (!file) return;
    setBusy(mode); setError(null);
    try {
      const form = new FormData();
      form.append("file", file); form.append("mode", mode);
      const res = await fetch("/api/programs/import", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) { setError(body.error || "The file could not be processed."); setResult(null); return; }
      setResult(body);
      if (mode === "import") { push(`Imported: ${body.written} records written.`); router.refresh(); }
    } catch {
      setError("The file could not be sent. Check your connection and try again.");
    } finally { setBusy(null); }
  }

  const checked = result && result.dryRun;
  const done = result && !result.dryRun;
  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <Card>
        <h2 className="text-sm font-semibold text-ink mb-1">1. Get the template</h2>
        <p className="text-xs text-ink-muted mb-3">One Excel workbook with a sheet for each kind of data. Fill only the sheets you have; the Read me sheet lists the allowed words.</p>
        <Button href="/api/programs/import" variant="secondary" icon={Download}>Download the template</Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-ink mb-1">2. Check your file</h2>
        <p className="text-xs text-ink-muted mb-3">The check tries everything and saves nothing. Fix the rows it lists, then check again.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 h-9 rounded-md border border-border-strong bg-surface-alt px-3 text-sm text-ink-muted cursor-pointer hover:border-primary-border">
            <Upload className="size-4" aria-hidden="true" />
            <span className="truncate max-w-64">{file ? file.name : "Choose an Excel file..."}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(null); }} />
          </label>
          <Button variant="secondary" icon={FileCheck} onClick={() => run("check")} loading={busy === "check"} disabled={!file || Boolean(busy)}>Check the file</Button>
        </div>
        {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
      </Card>

      {result && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              {result.errors ? <AlertTriangle className="size-4 text-warning" aria-hidden="true" /> : <CheckCircle2 className="size-4 text-success" aria-hidden="true" />}
              {done ? "Import finished" : "Result of the check (nothing saved yet)"}
            </h2>
            {checked && <Button variant="primary" onClick={() => run("import")} loading={busy === "import"} disabled={Boolean(busy)}>{result.errors ? `Import anyway (${result.errors} rows skipped)` : "3. Import now"}</Button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-ink-secondary border-b border-border"><th className="py-2 pr-3">Sheet</th><th className="pr-3">Rows</th><th className="pr-3">New</th><th className="pr-3">Updated</th><th className="pr-3">Unchanged</th><th>Problems</th></tr></thead>
              <tbody className="divide-y divide-border">
                {result.reports.map((r) => (
                  <tr key={r.sheet}><td className="py-2 pr-3 font-medium text-ink">{r.sheet}</td><td className="pr-3 tabular-nums">{r.read}</td><td className="pr-3 tabular-nums">{r.created}</td><td className="pr-3 tabular-nums">{r.updated}</td><td className="pr-3 tabular-nums">{r.unchanged}</td><td className={r.errorCount ? "text-danger tabular-nums" : "tabular-nums"}>{r.errorCount}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.newAlumni > 0 && <p className="text-xs text-ink-muted mt-2">{result.newAlumni} people become alumni (they completed a program).</p>}
          {result.reports.filter((r) => r.errorCount).map((r) => (
            <div key={r.sheet} className="mt-4">
              <h3 className="text-xs font-semibold text-ink mb-1">{r.sheet}: rows to fix{r.errorCount > r.errors.length ? ` (first ${r.errors.length} of ${r.errorCount})` : ""}</h3>
              <ul className="text-xs text-ink-secondary list-disc pl-5 space-y-0.5">{r.errors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}</ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
