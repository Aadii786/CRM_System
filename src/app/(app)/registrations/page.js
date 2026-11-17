import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listRegistrations } from "@/lib/services/registrationService";
import { listProgramOptions } from "@/lib/services/programService";
import { listCompanyOptions } from "@/lib/services/companyService";
import { hasPermission } from "@/lib/permissions/rbac";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import SearchInput from "@/components/ui/SearchInput";
import UrlSelect from "@/components/ui/UrlSelect";
import UrlDateInput from "@/components/ui/UrlDateInput";
import Pagination from "@/components/ui/Pagination";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { REGISTRATION_STATUSES, ATTENDANCE_STATUSES, PAYMENT_STATUSES, COMPLETION_STATUSES, REGISTRATION_SOURCES } from "@/lib/constants/programs";
import { ClipboardList } from "lucide-react";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

export const metadata = { title: "Registrations" };

const PAY_TONE = { Unpaid: "danger", "Partially paid": "warning", Paid: "success", Waived: "neutral" };
const ATT_TONE = { Registered: "neutral", Attended: "success", "No Show": "danger" };

export default async function RegistrationsPage({ searchParams }) {
  const user = await requireUserWithPermission("programs.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, programs, companies] = await Promise.all([
    listRegistrations(user, {
      q: sp.q || "", programId: sp.program, batchId: sp.batch, status: sp.status, attendance: sp.attendance, completion: sp.completion,
      paymentStatus: sp.payment, companyId: sp.company, source: sp.source, from: sp.from, to: sp.to, page, limit: 25,
    }),
    listProgramOptions(user),
    hasPermission(user, "companies.view") ? listCompanyOptions(user) : Promise.resolve([]),
  ]);

  const batchOptions = programs
    .filter((p) => !sp.program || String(p.id) === String(sp.program))
    .flatMap((p) => p.batches.map((b) => ({ value: String(b.id), label: `${p.title} · ${b.code || `Batch ${b.id}`}` })));

  function buildHref(target) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(Math.max(1, target)));
    return `/registrations?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader title={`Registrations (${result.pagination.total.toLocaleString()})`} description="Everyone registered for a batch of an open-enrollment program, from staff entries, company nominations and the website. Open a batch's roster to register people and mark attendance." />

      <FilterBar>
        <div className="w-64"><SearchInput placeholder="Search name or email" /></div>
        <UrlSelect paramName="program" allLabel="All programs" options={programs.map((p) => ({ value: String(p.id), label: p.title }))} className="w-52" />
        <UrlSelect paramName="batch" allLabel="All batches" options={batchOptions} className="w-56" />
        <UrlSelect paramName="status" allLabel="All statuses" options={REGISTRATION_STATUSES.map((s) => ({ value: s, label: s }))} className="w-36" />
        <UrlSelect paramName="attendance" allLabel="Any attendance" options={ATTENDANCE_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        <UrlSelect paramName="completion" allLabel="Any completion" options={COMPLETION_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        <UrlSelect paramName="payment" allLabel="Any payment" options={PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        {companies.length > 0 && <UrlSelect paramName="company" allLabel="All companies" options={companies.map((c) => ({ value: String(c.id), label: c.name }))} className="w-48" />}
        <UrlSelect paramName="source" allLabel="Any source" options={REGISTRATION_SOURCES.map((s) => ({ value: s, label: s }))} className="w-36" />
        <UrlDateInput paramName="from" label="Registered from" />
        <UrlDateInput paramName="to" label="to" />
      </FilterBar>

      {result.data.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No registrations match" description="Register people from a batch's roster (Programs > a program > Roster), or wait for the website registration form." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>{["Participant", "Program / batch", "Company", "Status", "Attendance", "Payment", "Completion", "Feedback", "Registered"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.data.map((r) => (
                <tr key={r.id} className={["bg-surface", r.status === "Cancelled" ? "opacity-55" : ""].join(" ")}>
                  <td className="px-3 py-3">
                    <Link href={`/contacts/${r.contactId}`} className="font-medium text-ink hover:text-primary">{r.contact?.firstName} {r.contact?.lastName}</Link>
                    <p className="text-xs text-ink-muted">{r.contact?.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/programs/${r.programId}/batches/${r.batchId}`} className="text-ink hover:text-primary">{r.program?.title}</Link>
                    <p className="text-xs text-ink-muted">{r.batch?.code || `Batch ${r.batchId}`} · {formatDate(r.batch?.startDate)}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-secondary">{r.company ? <Link href={`/companies/${r.company.id}`} className="hover:text-primary">{r.company.name}</Link> : "—"}</td>
                  <td className="px-3 py-3"><Badge tone={r.status === "Cancelled" ? "danger" : r.status === "Confirmed" ? "success" : "info"}>{r.status}</Badge></td>
                  <td className="px-3 py-3"><Badge tone={ATT_TONE[r.attendance] || "neutral"}>{r.attendance}</Badge></td>
                  <td className="px-3 py-3"><Badge tone={PAY_TONE[r.paymentStatus] || "neutral"}>{r.paymentStatus}</Badge><p className="text-xs text-ink-muted tabular-nums">{formatCurrencyFull(r.amountPaid)} / {formatCurrencyFull(r.fee)}</p></td>
                  <td className="px-3 py-3">{r.completionStatus === "Completed" ? <Badge tone="success">Completed</Badge> : <span className="text-ink-muted">{r.completionStatus}</span>}{r.certificateIssued && <p className="text-xs text-ink-muted">Cert. {r.certificateNumber || "issued"}</p>}</td>
                  <td className="px-3 py-3 text-ink-secondary tabular-nums">{r.feedbackScore ? `${r.feedbackScore} / 5` : "—"}</td>
                  <td className="px-3 py-3 text-ink-secondary whitespace-nowrap">{formatDate(r.createdAt)}<p className="text-xs text-ink-muted">{r.source}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} total={result.pagination.total} limit={result.pagination.limit} buildHref={buildHref} />
    </div>
  );
}
