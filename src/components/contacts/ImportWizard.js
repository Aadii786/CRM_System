"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, Copy, Loader2, FileCheck, ListChecks, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field, { Select, Input } from "@/components/ui/Field";
import { parseCsv } from "@/lib/utils/csv";
import { parseXlsx } from "@/lib/utils/xlsx";
import { checkDuplicatesAction, runImportAction } from "@/actions/imports";
import { createFolderAction, createListAction } from "@/actions/lists";
import { useToast } from "@/components/ui/Toast";

// Every mappable Contact attribute (requirements: match Brevo's full
// attribute list, not just a handful of fields) - "Do not import" is
// always available as the first option in each dropdown.
const CONTACT_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: false },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "SMS (Mobile Number)", required: false },
  { key: "whatsappNumber", label: "WhatsApp Number", required: false },
  { key: "landlineNumber", label: "Landline / Phone Number", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
  { key: "companyName", label: "Company name (linked or created)", required: false },
  { key: "externalId", label: "Ext ID", required: false },
  { key: "linkedin", label: "LinkedIn", required: false },
  { key: "city", label: "City", required: false },
  { key: "country", label: "Country", required: false },
  { key: "timezone", label: "Contact Timezone", required: false },
  { key: "detectedLanguage", label: "Detected Language", required: false },
  { key: "doubleOptIn", label: "Double Opt-In", required: false },
  { key: "optIn", label: "Opt-In", required: false },
  { key: "contactType", label: "Contact Type", required: false },
  { key: "source", label: "Source", required: false },
];

const STEPS = [
  { key: "upload", label: "Upload CSV" },
  { key: "map", label: "Map Fields" },
  { key: "list", label: "Select a List" },
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

export default function ImportWizard({ departmentKey, folders = [], lists: initialLists = [], canUseLists = false }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [lists, setLists] = useState(initialLists);
  const [selectedListId, setSelectedListId] = useState(null);
  const [duplicateCount, setDuplicateCount] = useState(null);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const { push } = useToast();
  const router = useRouter();

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
    setFileError(null);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    function applyParsed({ headers: h, rows: r }) {
      if (h.length === 0 || r.length === 0) {
        setFileError("Couldn't find any data in that file - check it has a header row and at least one data row.");
        return;
      }
      setHeaders(h);
      setRows(r);
      setMapping(guessMapping(h));
      setStepIndex(1);
    }

    const reader = new FileReader();
    reader.onerror = () => setFileError("Couldn't read that file. Try re-saving it and uploading again.");

    if (isExcel) {
      // .xlsx/.xls are binary (zip-based) - reading them as text produces
      // garbage (their raw bytes start with the ZIP signature "PK...").
      // Real files need SheetJS reading an ArrayBuffer, not readAsText().
      reader.onload = () => {
        try {
          applyParsed(parseXlsx(reader.result));
        } catch {
          setFileError("Couldn't parse that Excel file. Try exporting it as .csv instead.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => applyParsed(parseCsv(String(reader.result)));
      reader.readAsText(file);
    }
  }

  async function goToDuplicates() {
    setStepIndex(4);
    setChecking(true);
    const validEmails = mappedRows.filter((r) => r.firstName && EMAIL_RE.test(r.email)).map((r) => r.email);
    const { duplicateCount: count } = await checkDuplicatesAction(departmentKey, validEmails.slice(0, 2000));
    setDuplicateCount(count);
    setChecking(false);
  }

  async function runTheImport() {
    setStepIndex(5);
    setImporting(true);
    const result = await runImportAction({ filename: fileName, departmentKey, rows: mappedRows, listId: selectedListId });
    setSummary(result);
    setImporting(false);
    setStepIndex(6);
    push(`Imported ${result.importedRows.toLocaleString()} contacts${result.listName ? ` into "${result.listName}"` : ""}.`);
    router.refresh();
  }

  function reset() {
    setStepIndex(0);
    setFileName("");
    setFileError(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSelectedListId(null);
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
            <h3 className="text-sm font-semibold text-ink mb-1">Upload a CSV or Excel file</h3>
            <p className="text-sm text-ink-muted max-w-sm mb-5">
              .csv, .xlsx or .xls. Expect columns like First Name, Last Name, Email, SMS, WhatsApp, Job Title, LinkedIn, Timezone... Field mapping is next.
            </p>
            {fileError && (
              <p className="text-sm text-danger max-w-sm mb-4">{fileError}{fileName ? ` (${fileName})` : ""}</p>
            )}
            <label className="inline-flex">
              <input type="file" accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFile} className="hidden" />
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
                    <option value={-1}>— Do not import —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" icon={ArrowLeft} onClick={reset}>Start Over</Button>
              <Button variant="primary" iconRight={ArrowRight} onClick={() => setStepIndex(canUseLists ? 2 : 3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === "list" && (
          <ListStep
            folders={folders}
            lists={lists}
            selectedListId={selectedListId}
            onSelect={setSelectedListId}
            onListCreated={(list) => {
              setLists((prev) => [...prev, list]);
              setSelectedListId(list.id);
            }}
            onBack={() => setStepIndex(1)}
            onContinue={() => setStepIndex(3)}
          />
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
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStepIndex(canUseLists ? 2 : 1)}>Back</Button>
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
                <p className="text-sm text-ink-muted mb-6">
                  Duplicate rows (matched by email within your department) will be skipped, not overwritten.
                  {selectedListId && ` Imported contacts will be added to "${lists.find((l) => l.id === selectedListId)?.name}".`}
                </p>
                <div className="flex justify-between">
                  <Button variant="ghost" icon={ArrowLeft} onClick={() => setStepIndex(3)}>Back</Button>
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
              {summary.listName && <p className="text-sm text-ink-muted mt-1">Added to list <span className="font-medium text-ink">{summary.listName}</span></p>}
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
              {selectedListId && <Button variant="secondary" href={`/lists/${selectedListId}`}>View List</Button>}
              <Button variant="primary" onClick={reset}>Import Another File</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ListStep({ folders, lists, selectedListId, onSelect, onListCreated, onBack, onContinue }) {
  const [tab, setTab] = useState("select");
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");

  const visible = useMemo(() => {
    return lists.filter((l) => {
      if (folderFilter !== "all" && String(l.folderId) !== folderFilter) return false;
      if (query.trim() && !l.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [lists, folderFilter, query]);

  return (
    <div>
      <p className="text-sm text-ink-muted mb-4">
        Choose an existing List to add every imported contact to, or create a new one. Optional - you can skip this and organize contacts afterward.
      </p>

      <div className="flex gap-1 mb-4 border-b border-border">
        <button type="button" onClick={() => setTab("select")} className={["px-3 py-2 text-sm font-medium border-b-2 -mb-px", tab === "select" ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"].join(" ")}>
          Select a list
        </button>
        <button type="button" onClick={() => setTab("create")} className={["px-3 py-2 text-sm font-medium border-b-2 -mb-px", tab === "create" ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink"].join(" ")}>
          Create a list
        </button>
      </div>

      {tab === "select" ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a list..." className="pl-8" />
            </div>
            <Select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="w-auto min-w-[160px]">
              <option value="all">All folders</option>
              {folders.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
            </Select>
          </div>
          <div className="rounded-md border border-border max-h-64 overflow-y-auto mb-2">
            {visible.length === 0 ? (
              <p className="text-sm text-ink-muted px-3 py-6 text-center">No lists match. Create one instead.</p>
            ) : (
              visible.map((l) => (
                <label key={l.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-alt cursor-pointer">
                  <input type="radio" name="import-list" checked={selectedListId === l.id} onChange={() => onSelect(l.id)} className="text-primary" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-ink truncate">{l.name}</span>
                    <span className="block text-xs text-ink-muted">{l.folder?.name || "—"} · {l.contactCount.toLocaleString()} contacts</span>
                  </span>
                </label>
              ))
            )}
          </div>
          {selectedListId && (
            <button type="button" onClick={() => onSelect(null)} className="text-xs text-ink-muted hover:text-ink underline mb-4">
              Clear selection (skip list assignment)
            </button>
          )}
        </>
      ) : (
        <CreateListInline folders={folders} onCreated={onListCreated} />
      )}

      <div className="flex justify-between mt-2">
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>Back</Button>
        <Button variant="primary" iconRight={ArrowRight} onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}

function CreateListInline({ folders, onCreated }) {
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(folders[0]?.id ? String(folders[0].id) : "");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(folders.length === 0);
  const [localFolders, setLocalFolders] = useState(folders);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const { push } = useToast();

  async function saveNewFolder() {
    setError(null);
    setPending(true);
    const fd = new FormData();
    fd.set("name", newFolderName);
    const result = await createFolderAction(fd);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setLocalFolders((prev) => [...prev, { id: result.id, name: result.name }]);
    setFolderId(String(result.id));
    setNewFolderName("");
    setCreatingFolder(false);
    push(`Folder "${result.name}" created.`);
  }

  async function saveList() {
    setError(null);
    if (!name.trim()) {
      setError("List name is required.");
      return;
    }
    if (!folderId) {
      setError("Choose or create a folder first.");
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("folderId", folderId);
    const result = await createListAction(fd);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    push(`List "${name}" created.`);
    onCreated({ id: result.id, name, folderId: Number(folderId), contactCount: 0, folder: localFolders.find((f) => String(f.id) === folderId) });
  }

  return (
    <div className="flex flex-col gap-4 mb-4">
      <Field label="Name of the list" htmlFor="il-name" required>
        <Input id="il-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Imported - Sep 2026" autoFocus />
      </Field>
      <Field label="Folder" htmlFor="il-folder" required>
        <Select id="il-folder" value={creatingFolder ? "__new__" : folderId} onChange={(e) => (e.target.value === "__new__" ? setCreatingFolder(true) : setFolderId(e.target.value))}>
          <option value="" disabled>Select a folder</option>
          {localFolders.map((f) => <option key={f.id} value={String(f.id)}>{f.name}</option>)}
          <option value="__new__">+ Create a new folder</option>
        </Select>
      </Field>
      {creatingFolder && (
        <div className="rounded-md border border-border bg-surface-alt p-3.5 flex flex-col gap-3">
          <Field label="Name of the folder" htmlFor="il-new-folder">
            <Input id="il-new-folder" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter a folder name" />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" loading={pending} onClick={saveNewFolder}>Create folder</Button>
            {localFolders.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingFolder(false)}>Cancel</Button>}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="secondary" icon={ListChecks} loading={pending} onClick={saveList} className="self-start">
        Create List
      </Button>
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
