"use client";

import { useMemo, useState } from "react";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Copy, Loader2, FileCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { parseCsv } from "@/lib/utils/csv";
import { checkDuplicatesAction, runImportAction } from "@/actions/imports";
import { useToast } from "@/components/ui/Toast";

const CONTACT_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: false },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
  { key: "city", label: "City", required: false },
  { key: "source", label: "Source", required: false },
];

const STEPS = [
  { key: "upload", label: "Upload CSV" },
  { key: "map", label: "Map Fields" },
  { key: "validate", label: "Validate Data" },
  { key: "duplicates", label: "Duplicate Detection" },
  { key: "import", label: "Import" },
  { key: "summary", label: "Summary" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function guessMapping(headers) {
  const mapping = {};
  for (const field of CONTACT_FIELDS) {
    const idx = headers.findIndex((h) => h.toLowerCase().replace(/[^a-z]/g, "") === field.key.toLowerCase());
    mapping[field.key] = idx >= 0 ? idx : headers.findIndex((h) => h.toLowerCase().includes(field.key.slice(0, 4).toLowerCase()));
  }
  return mapping;
}

export default function ImportWizard({ departmentKey }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [duplicateCount, setDuplicateCount] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const { push } = useToast();

  const step = STEPS[stepIndex].key;

  const mappedRows = useMemo(() => {
    return rows.map((r) => {
      const obj = {};
      for (const field of CONTACT_FIELDS) {
        const idx = mapping[field.key];
        obj[field.key] = idx != null && idx >= 0 ? (r[idx] || "").trim() : "";
      }
      return obj;
    });
  }, [rows, mapping]);

  const validation = useMemo(() => {
    let valid = 0, invalid = 0;
    for (const r of mappedRows) {
      if (r.firstName && r.email && EMAIL_RE.test(r.email)) valid++;
      else invalid++;
    }
    return { valid, invalid, total: mappedRows.length };
  }, [mappedRows]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { headers: h, rows: r } = parseCsv(String(reader.result));
      setHeaders(h);
      setRows(r);
      setMapping(guessMapping(h));
      setStepIndex(1);
    };
    reader.readAsText(file);
  }

  async function goToDuplicates() {
    setStepIndex(3);
    setChecking(true);
    const validEmails = mappedRows.filter((r) => r.firstName && EMAIL_RE.test(r.email)).map((r) => r.email);
    const { duplicateCount: count } = await checkDuplicatesAction(departmentKey, validEmails.slice(0, 2000));
    setDuplicateCount(count);
    setChecking(false);
  }

  async function runTheImport() {
    setStepIndex(4);
    setImporting(true);
    const result = await runImportAction({ filename: fileName, departmentKey, rows: mappedRows });
    setSummary(result);
    setImporting(false);
    setStepIndex(5);
    push(`Imported ${result.importedRows.toLocaleString()} contacts.`);
  }

  function reset() {
    setStepIndex(0);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setDuplicateCount(null);
    setSummary(null);
  }

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <div
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border",
                i < stepIndex ? "bg-success-subtle text-success border-success-border" :
                i === stepIndex ? "bg-primary-subtle text-primary-active border-primary-border" :
                "bg-surface-alt text-ink-muted border-border",
              ].join(" ")}
            >
              {i < stepIndex ? <CheckCircle2 className="size-3.5" /> : <span>{i + 1}</span>}
              {s.label}
            </div>
            {i < STEPS.length - 1 && <ArrowRight className="size-3.5 text-ink-muted shrink-0" />}
          </div>
        ))}
      </div>

      <Card>
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary mb-4">
              <Upload className="size-5" />
            </span>
            <h3 className="text-sm font-semibold text-ink mb-1">Upload a CSV file</h3>
            <p className="text-sm text-ink-muted max-w-sm mb-5">
              Expect columns like First Name, Last Name, Email, Phone, Job Title, City, Source. Field mapping is next.
            </p>
            <label className="inline-flex">
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              <span className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-primary px-4 h-9 text-sm font-medium text-white hover:bg-primary-hover">
                Choose File
              </span>
            </label>
          </div>
        )}

        {step === "map" && (
          <div>
            <p className="text-sm text-ink-muted mb-4">
              <FileCheck className="inline size-4 mr-1 -mt-0.5" /> {fileName} · {rows.length.toLocaleString()} rows detected
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {CONTACT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    {field.label} {field.required && <span className="text-danger">*</span>}
                  </label>
                  <Select
                    value={mapping[field.key] ?? -1}
                    onChange={(e) => setMapping((m) => ({ ...m, [field.key]: Number(e.target.value) }))}
                  >
                    <option value={-1}>— Not mapped —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" icon={ArrowLeft} onClick={reset}>Start Over</Button>
              <Button variant="primary" iconRight={ArrowRight} onClick={() => setStepIndex(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === "validate" && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <SummaryTile label="Total Rows" value={validation.total} tone="neutral" />
              <SummaryTile label="Valid" value={validation.valid} tone="success" />
              <SummaryTile label="Invalid" value={validation.invalid} tone="danger" />
            </div>
            <p className="text-sm text-ink-muted mb-6">
              Invalid rows are missing a first name or a valid email address and will be skipped automatically.
            </p>
            <div className="flex justify-between">
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStepIndex(1)}>Back</Button>
              <Button variant="primary" iconRight={ArrowRight} onClick={goToDuplicates}>Continue</Button>
            </div>
          </div>
        )}

        {step === "duplicates" && (
          <div>
            {checking ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-8 justify-center">
                <Loader2 className="size-4 animate-spin" /> Checking against existing contacts...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <SummaryTile label="Duplicates Found" value={duplicateCount ?? 0} tone="warning" icon={Copy} />
                  <SummaryTile label="Will Be Imported" value={Math.max(validation.valid - (duplicateCount || 0), 0)} tone="success" icon={CheckCircle2} />
                </div>
                <p className="text-sm text-ink-muted mb-6">Duplicate rows (matched by email within your department) will be skipped, not overwritten.</p>
                <div className="flex justify-between">
                  <Button variant="ghost" icon={ArrowLeft} onClick={() => setStepIndex(2)}>Back</Button>
                  <Button variant="primary" iconRight={ArrowRight} onClick={runTheImport}>Start Import</Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "import" && (
          <div className="flex flex-col items-center justify-center text-center py-14">
            <Loader2 className="size-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-ink">Importing {rows.length.toLocaleString()} contacts...</p>
            <p className="text-xs text-ink-muted mt-1">This runs as a single bulk database insert, so it stays fast even at tens of thousands of rows.</p>
          </div>
        )}

        {step === "summary" && summary && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle text-success mb-3">
                <CheckCircle2 className="size-6" />
              </span>
              <h3 className="text-base font-semibold text-ink">Import Complete</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <SummaryTile label="Total Rows" value={summary.totalRows} tone="neutral" />
              <SummaryTile label="Valid" value={summary.validRows} tone="success" />
              <SummaryTile label="Duplicates" value={summary.duplicateRows} tone="warning" />
              <SummaryTile label="Invalid" value={summary.invalidRows} tone="danger" />
              <SummaryTile label="Imported" value={summary.importedRows} tone="primary" />
            </div>
            <div className="flex justify-center gap-2.5">
              <Button variant="secondary" href="/contacts">View Contacts</Button>
              <Button variant="primary" onClick={reset}>Import Another File</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

const TILE_TONES = {
  neutral: "bg-surface-alt text-ink border-border",
  success: "bg-success-subtle text-success border-success-border",
  warning: "bg-warning-subtle text-warning border-warning-border",
  danger: "bg-danger-subtle text-danger border-danger-border",
  primary: "bg-primary-subtle text-primary-active border-primary-border",
};

function SummaryTile({ label, value, tone, icon: Icon }) {
  return (
    <div className={["rounded-lg border p-4 text-center", TILE_TONES[tone]].join(" ")}>
      {Icon && <Icon className="size-4 mx-auto mb-1.5" />}
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs mt-0.5 opacity-90">{label}</p>
    </div>
  );
}
