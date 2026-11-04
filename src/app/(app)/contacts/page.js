import { Suspense } from "react";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getContacts, getContactStats } from "@/lib/services/contactService";
import { listCompanyOptions } from "@/lib/services/companyService";
import UrlDateInput from "@/components/ui/UrlDateInput";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import SearchInput from "@/components/ui/SearchInput";
import UrlSelect from "@/components/ui/UrlSelect";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ContactsTable from "@/components/contacts/ContactsTable";
import { CONTACT_STATUSES, ENGAGEMENT_STATUSES, LEAD_SOURCES } from "@/lib/constants/crm";
import { UserPlus, Upload, Download } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }) {
  const user = await requireUserWithPermission("contacts.view");
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const filters = {
    page,
    limit: 25,
    q: sp.q || "",
    status: sp.status || undefined,
    source: sp.source || undefined,
    engagementStatus: sp.engagement || undefined,
    companyId: sp.company || undefined,
    createdFrom: sp.createdFrom || undefined,
    createdTo: sp.createdTo || undefined,
    activityFrom: sp.activityFrom || undefined,
    activityTo: sp.activityTo || undefined,
  };

  const [{ data: rawContacts, pagination }, stats, companyOptions] = await Promise.all([
    getContacts(user, filters),
    getContactStats(user),
    hasPermission(user, "companies.view") ? listCompanyOptions(user) : Promise.resolve([]),
  ]);
  // Sequelize model instances aren't plain-serializable, so flatten before
  // they cross into the client-rendered table component.
  const contacts = rawContacts.map((c) => c.get({ plain: true }));

  function buildHref(targetPage) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.engagementStatus) params.set("engagement", filters.engagementStatus);
    for (const k of ["company", "createdFrom", "createdTo", "activityFrom", "activityTo"]) if (sp[k]) params.set(k, sp[k]);
    params.set("page", String(Math.max(1, targetPage)));
    return `/contacts?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title={`Contacts (${formatNumber(stats.total)})`}
        description="University-wide contact database - search, segment and manage every lead across the platform."
        actions={
          <>
            {hasPermission(user, "contacts.import") && (
              <Button href="/contacts/import" variant="secondary" icon={Upload}>
                Import
              </Button>
            )}
            {hasPermission(user, "contacts.export") && (
              <Button href="/api/contacts/export" variant="secondary" icon={Download}>
                Export
              </Button>
            )}
            {hasPermission(user, "contacts.create") && (
              <Button href="/contacts/new" variant="primary" icon={UserPlus}>
                Create Contact
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Card padding="sm">
          <p className="text-xs text-ink-muted mb-1">Total</p>
          <p className="text-lg font-semibold text-ink">{formatNumber(stats.total)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-ink-muted mb-1">Qualified</p>
          <p className="text-lg font-semibold text-success">{formatNumber(stats.byStatus.Qualified || 0)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-ink-muted mb-1">Engaged</p>
          <p className="text-lg font-semibold text-primary">{formatNumber((stats.byEngagement.Engaged || 0) + (stats.byEngagement.Clicked || 0) + (stats.byEngagement.Opened || 0))}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-ink-muted mb-1">Inactive</p>
          <p className="text-lg font-semibold text-ink-muted">{formatNumber(stats.byEngagement.Inactive || 0)}</p>
        </Card>
      </div>

      <FilterBar>
        <SearchInput placeholder="Search name, email, phone..." />
        <UrlSelect paramName="status" allLabel="All statuses" options={CONTACT_STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
        <UrlSelect paramName="engagement" allLabel="All engagement" options={ENGAGEMENT_STATUSES.map((s) => ({ value: s, label: s }))} className="w-44" />
        <UrlSelect paramName="source" allLabel="All sources" options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} className="w-40" />
        {companyOptions.length > 0 && (
          <UrlSelect paramName="company" allLabel="All organizations" options={companyOptions.map((c) => ({ value: String(c.id), label: c.name }))} className="w-56" />
        )}
      </FilterBar>
      <FilterBar>
        <UrlDateInput paramName="createdFrom" label="Created from" />
        <UrlDateInput paramName="createdTo" label="to" />
        <UrlDateInput paramName="activityFrom" label="Last activity from" />
        <UrlDateInput paramName="activityTo" label="to" />
      </FilterBar>

      <Suspense fallback={<div className="h-96 rounded-lg border border-border bg-surface animate-pulse" />}>
        <ContactsTable contacts={contacts} canEdit={hasPermission(user, "contacts.update")} />
      </Suspense>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
