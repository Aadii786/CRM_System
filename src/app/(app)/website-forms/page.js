import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { getAccessibleDepartmentKeys } from "@/lib/permissions/rbac";
import { allDepartmentKeys, departmentIdsForKeys } from "@/lib/services/departmentService";
import { listFormSubmissions, FORM_TYPES } from "@/lib/services/websiteFormService";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import UrlSelect from "@/components/ui/UrlSelect";
import Pagination from "@/components/ui/Pagination";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Website forms" };

const LABEL = { enquiry: "Enquiry", brochure: "Brochure download", registration: "Registration", feedback: "Feedback" };
const TONE = { "New lead": "success", Matched: "info", Rejected: "danger" };

function summary(payload = {}) {
  const bits = [payload.programCode || payload.programId, payload.batchCode || payload.batchId, payload.company, payload.score ?? payload.rating ? `score ${payload.score ?? payload.rating}` : null].filter(Boolean);
  const message = payload.message || payload.comments;
  return [bits.join(" · "), message ? `"${String(message).slice(0, 90)}"` : null].filter(Boolean).join(" ");
}

export default async function WebsiteFormsPage({ searchParams }) {
  const user = await requireUserWithPermission("contacts.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const deptIds = await departmentIdsForKeys(getAccessibleDepartmentKeys(user, await allDepartmentKeys()));
  const result = await listFormSubmissions(deptIds, { type: sp.type, status: sp.status, page, limit: 25 });

  function buildHref(target) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
    params.set("page", String(Math.max(1, target)));
    return `/website-forms?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title={`Website forms (${result.pagination.total.toLocaleString()})`}
        description="Every enquiry, brochure download, registration and feedback form that reached the CRM from the IKL website. Each person is matched by email (no duplicates), tagged with the source Website and handed to an owner."
      />
      <FilterBar>
        <UrlSelect paramName="type" allLabel="All forms" options={FORM_TYPES.map((t) => ({ value: t, label: LABEL[t] }))} className="w-48" />
        <UrlSelect paramName="status" allLabel="All results" options={[{ value: "New lead", label: "New lead" }, { value: "Matched", label: "Matched an existing person" }, { value: "Rejected", label: "Rejected" }]} className="w-56" />
      </FilterBar>

      {result.data.length === 0 ? (
        <EmptyState icon={Globe} title="No website forms yet" description="Forms arrive here once the website posts them to /api/public/forms/<type> with the IKL API key (see docs/website-forms.md)." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>{["Received", "Form", "Person", "Details", "Result"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.data.map((r) => (
                <tr key={r.id} className="bg-surface align-top">
                  <td className="px-3 py-3 whitespace-nowrap text-ink-secondary">{formatDateTime(r.createdAt)}</td>
                  <td className="px-3 py-3 text-ink">{LABEL[r.formType] || r.formType}</td>
                  <td className="px-3 py-3">
                    {r.contact ? (
                      <>
                        <Link href={`/contacts/${r.contact.id}`} className="font-medium text-ink hover:text-primary">{r.contact.firstName} {r.contact.lastName}</Link>
                        <p className="text-xs text-ink-muted">{r.contact.email}</p>
                      </>
                    ) : <span className="text-ink-muted">{r.payload?.email || "—"}</span>}
                  </td>
                  <td className="px-3 py-3 text-ink-secondary max-w-sm">{summary(r.payload) || "—"}{r.error && <p className="text-xs text-danger mt-0.5">{r.error}</p>}</td>
                  <td className="px-3 py-3"><Badge tone={TONE[r.status] || "neutral"}>{r.status}</Badge>{r.registrationId && <p className="text-xs text-ink-muted mt-0.5">Registration #{r.registrationId}</p>}</td>
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
