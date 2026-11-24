import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { searchDocuments, documentFilterOptions, documentIndexStatus, DOCUMENT_TYPES } from "@/lib/services/documentSearchService";
import { resolveRange, toIsoDay } from "@/lib/utils/dateRange";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ReindexDocumentsButton from "@/components/documents/ReindexDocumentsButton";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Documents" };

const RELATED_HREF = { contact: "/contacts", company: "/companies", deal: "/deals", meeting: "/meetings" };

function bytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Splits a snippet around the search words so they can be highlighted. */
function Highlight({ text, q }) {
  if (!q) return text;
  const lower = text.toLowerCase(), needle = q.toLowerCase();
  const parts = []; let i = 0;
  for (;;) {
    const at = lower.indexOf(needle, i);
    if (at < 0) { parts.push(text.slice(i)); break; }
    parts.push(text.slice(i, at), <mark key={at} className="bg-warning-subtle text-ink rounded px-0.5">{text.slice(at, at + needle.length)}</mark>);
    i = at + needle.length;
  }
  return <>{parts}</>;
}

export default async function DocumentsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const get = (k) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) || "";
  const q = get("q").trim();
  const scope = ["all", "names", "content"].includes(get("scope")) ? get("scope") : "all";
  const range = resolveRange({ from: get("from"), to: get("to") });
  const page = Math.max(1, Number(get("page")) || 1);

  const [result, options, status] = await Promise.all([
    searchDocuments(user, { q, scope, type: get("type"), companyId: get("company"), programId: get("program"), from: range.from, to: range.to, page }),
    documentFilterOptions(user),
    documentIndexStatus(user),
  ]);
  const pages = Math.max(1, Math.ceil(result.total / result.limit));
  const link = (p) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : [v]) params.append(k, x);
    params.set("page", String(p));
    return `/documents?${params.toString()}`;
  };
  const field = "h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

  return (
    <div>
      <PageHeader title="Documents" description="Find any attached document by its name, title, description or the words inside it (PDF, Word, Excel, PowerPoint and text files)." />

      <form method="get" className="rounded-md border border-border bg-surface p-3 mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-ink-muted" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Search words, for example: leadership, invoice, minutes" aria-label="Search words" className={`${field} w-full pl-8`} />
          </div>
          <select name="scope" defaultValue={scope} aria-label="Where to look" className={field}>
            <option value="all">Names and inside the files</option>
            <option value="names">Names, titles and descriptions only</option>
            <option value="content">Inside the files only</option>
          </select>
          <Button type="submit" variant="primary">Search</Button>
          <Button href="/documents" variant="ghost">Clear</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <select name="type" defaultValue={get("type")} aria-label="File type" className={field}>
            <option value="">Any type</option>
            {DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select name="company" defaultValue={get("company")} aria-label="Client" className={`${field} max-w-56`}>
            <option value="">Any client</option>
            {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="program" defaultValue={get("program")} aria-label="Program" className={`${field} max-w-56`}>
            <option value="">Any program</option>
            {options.programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <label className="flex items-center gap-1.5">Uploaded from <input type="date" name="from" defaultValue={toIsoDay(range.from)} className={field} /></label>
          <label className="flex items-center gap-1.5">to <input type="date" name="to" defaultValue={toIsoDay(range.to)} className={field} /></label>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-ink-muted">
        <span>{result.total} document{result.total === 1 ? "" : "s"} found{status.waiting ? ` · ${status.waiting} not yet read for search` : ""}</span>
        {hasPermission(user, "contacts.update") && status.waiting > 0 && <ReindexDocumentsButton waiting={status.waiting} />}
      </div>

      <Card padding="none">
        {result.rows.length === 0 ? (
          <EmptyState icon={FileText} title="No documents found" description={q ? "Try other words, or search inside the files and the names together." : "Attach documents to a contact, company, deal or meeting and they appear here."} />
        ) : (
          <div className="divide-y divide-border">
            {result.rows.map((d) => (
              <div key={d.id} className="px-4 py-3 flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">{d.title || d.name}</a>
                  {d.title && <span className="text-xs text-ink-muted">{d.name}</span>}
                  <span className="text-xs text-ink-muted">{bytes(d.fileSize)}</span>
                </div>
                <div className="text-xs text-ink-muted flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{d.relatedType}: <Link href={`${RELATED_HREF[d.relatedType]}/${d.relatedId}`} className="text-ink-secondary hover:underline">{d.relatedLabel || `#${d.relatedId}`}</Link></span>
                  {d.companyName && d.relatedType !== "company" && <span>Client: {d.companyName}</span>}
                  {d.programTitle && <span>Program: {d.programTitle}</span>}
                  <span>{d.uploader || "Unknown"} · {formatDate(d.createdAt)}</span>
                  {d.contentStatus === "empty" && <span title="No text could be read, for example a scanned image">no readable text</span>}
                  {d.contentStatus === null && <span>not yet read for search</span>}
                </div>
                {d.description && <p className="text-xs text-ink-secondary"><Highlight text={d.description} q={q} /></p>}
                {d.snippet && <p className="text-xs text-ink-secondary border-l-2 border-border pl-2">…<Highlight text={d.snippet.replace(/\s+/g, " ")} q={q} />…</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="text-primary hover:underline">Previous</Link> : <span />}
          <span className="text-ink-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={link(page + 1)} className="text-primary hover:underline">Next</Link> : <span />}
        </div>
      )}
    </div>
  );
}
