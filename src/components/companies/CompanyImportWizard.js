"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, FileCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { parseCsv } from "@/lib/utils/csv";
import { parseXlsx } from "@/lib/utils/xlsx";
import { previewCompanyImportAction, runCompanyImportAction } from "@/actions/companyImports";
import { useToast } from "@/components/ui/Toast";

const FIELDS = [
  { key: "name", label: "Company name", required: true },
  { key: "organizationType", label: "Organization type" },
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Company size" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "leadSource", label: "Lead source" },
  { key: "status", label: "Status" },
];

const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
const ALIASES = { name: ["name", "companyname", "company", "organization", "organisation", "client", "clientname"], organizationType: ["organizationtype", "type", "organisationtype"], companySize: ["companysize", "size"], leadSource: ["leadsource", "source"] };

function guessMapping(headers) {
  const mapping = {};
  for (const f of FIELDS) {
    const wanted = ALIASES[f.key] || [norm(f.key)];
    mapping[f.key] = headers.findIndex((h) => wanted.includes(norm(h)));
  }
  return mapping;
}

/** Upload an Excel / CSV of corporate clients, map the columns, see duplicates, import. */
export default function CompanyImportWizard({ departmentKey }) {
  const [stage, setStage] = useState("upload"); // upload | map | done
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  const mappedRows = useMemo(() => rows.map((r) => {
    const o = {};
    for (const f of FIELDS) o[f.key] = mapping[f.key] >= 0 && mapping[f.key] != null ? String(r[mapping[f.key]] ?? "").trim() : "";
    return o;
  }), [rows, mapping]);

  function runPreview(nextRows) {
    startTransition(async () => {
      const result = await previewCompanyImportAction({ departmentKey, rows: nextRows });
      if (result?.error) setError(result.error);
      else { setError(null); setPreview(result); }
    });
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileError(null);
    const reader = new FileReader();
    reader.onerror = () => setFileError("Could not read that file. Try saving it again.");
    const apply = ({ headers: h, rows: r }) => {
      if (!h.length || !r.length) return setFileError("No data found. The first row must be the column headings, followed by at least one company.");
      setHeaders(h); setRows(r);
      const m = guessMapping(h);
      setMapping(m); setStage("map"); setPreview(null);
      runPreview(r.map((row) => {
        const o = {};
        for (const f of FIELDS) o[f.key] = m[f.key] >= 0 ? String(row[m[f.key]] ?? "").trim() : "";
        return o;
      }));
    };
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      reader.onload = () => { try { apply(parseXlsx(reader.result)); } catch { setFileError("Could not read that Excel file. Try saving it as .csv."); } };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => apply(parseCsv(String(reader.result)));
      reader.readAsText(file);
    }
  }

  function changeMapping(key, value) {
    const next = { ...mapping, [key]: Number(value) };
    setMapping(next);
    setPreview(null);
    runPreview(rows.map((row) => {
      const o = {};
      for (const f of FIELDS) o[f.key] = next[f.key] >= 0 ? String(row[next[f.key]] ?? "").trim() : "";
      return o;
    }));
  }

  function doImport() {
    startTransition(async () => {
      const result = await runCompanyImportAction({ filename: fileName, departmentKey, rows: mappedRows });
      if (result?.error) { setError(result.error); return; }
      setSummary(result);
      setStage("done");
      push(`Imported ${result.importedRows.toLocaleString()} companies.`);
      router.refresh();
    });
  }

  function reset() {
    setStage("upload"); setFileName(""); setHeaders([]); setRows([]); setMapping({}); setPreview(null); setSummary(null); setError(null);
  }

  return (
    <Card>
      {stage === "upload" && (
        <div className="flex flex-col items-center text-center py-10">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary mb-4"><Upload className="size-6" /></span>
          <h3 className="text-base font-semibold text-ink mb-1">Upload a file of companies</h3>
          <p className="text-sm text-ink-muted mb-5 max-w-md">Excel (.xlsx) or CSV. The first row must be the column headings. Companies already in the CRM (same name or website) are skipped, never overwritten.</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-alt focus-within:outline focus-within:outline-2 focus-within:outline-primary">
            <FileCheck className="size-4" /> Choose file
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={handleFile} />
          </label>
          {fileError && <p className="text-sm text-danger mt-3" role="alert">{fileError}</p>}
        </div>
      )}

      {stage === "map" && (
        <div>
          <h3 className="text-base font-semibold text-ink mb-1">Match the columns</h3>
          <p className="text-sm text-ink-muted mb-4">{fileName} · {rows.length.toLocaleString()} rows. Choose which column holds each field.</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink">{f.label}{f.required && <span className="text-danger"> *</span>}</span>
                <Select value={mapping[f.key] ?? -1} onChange={(e) => changeMapping(f.key, e.target.value)}>
                  <option value={-1}>Do not import</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </Select>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-surface-alt p-4 mb-5">
            {!preview ? (
              <p className="text-sm text-ink-muted">Checking the file for duplicates...</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div><p className="text-xl font-semibold text-success">{preview.valid.toLocaleString()}</p><p className="text-xs text-ink-muted">Will be imported</p></div>
                  <div><p className="text-xl font-semibold text-warning">{preview.duplicates.toLocaleString()}</p><p className="text-xs text-ink-muted">Duplicates (skipped)</p></div>
                  <div><p className="text-xl font-semibold text-danger">{preview.invalid.toLocaleString()}</p><p className="text-xs text-ink-muted">Invalid (skipped)</p></div>
                </div>
                {preview.sample.length > 0 && (
                  <ul className="text-xs text-ink-secondary flex flex-col gap-0.5">
                    {preview.sample.map((s) => <li key={s.rowNumber}>Row {s.rowNumber}: {s.name || "(empty)"} - {s.message}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-danger mb-3" role="alert">{error}</p>}
          <div className="flex justify-between">
            <Button variant="ghost" icon={ArrowLeft} onClick={reset}>Choose another file</Button>
            <Button variant="primary" iconRight={ArrowRight} loading={isPending} disabled={!preview || preview.valid === 0 || mapping.name == null || mapping.name < 0} onClick={doImport}>
              Import {preview ? preview.valid.toLocaleString() : ""} companies
            </Button>
          </div>
        </div>
      )}

      {stage === "done" && summary && (
        <div className="flex flex-col items-center text-center py-6">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle text-success mb-3"><CheckCircle2 className="size-6" /></span>
          <h3 className="text-base font-semibold text-ink mb-4">Import complete</h3>
          <div className="grid grid-cols-4 gap-3 mb-6 w-full max-w-lg">
            {[["Rows", summary.totalRows], ["Imported", summary.importedRows], ["Duplicates", summary.duplicateRows], ["Invalid", summary.invalidRows]].map(([l, v]) => (
              <div key={l}><p className="text-xl font-semibold text-ink">{Number(v).toLocaleString()}</p><p className="text-xs text-ink-muted">{l}</p></div>
            ))}
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" href="/companies">View companies</Button>
            <Button variant="primary" onClick={reset}>Import another file</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
