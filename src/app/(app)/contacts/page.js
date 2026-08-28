import { Suspense } from "react";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getContacts, getContactStats } from "@/lib/services/contactService";
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
  };

  const [{ data: rawContacts, pagination }, stats] = await Promise.all([
    getContacts(user, filters),
    getContactStats(user),
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
            <Button href="/contacts/import" variant="secondary" icon={Upload}>
              Import
            </Button>
            <Button href="/api/contacts/export" variant="secondary" icon={Download}>
              Export
            </Button>
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
      </FilterBar>

      <Suspense fallback={<div className="h-96 rounded-lg border border-border bg-surface animate-pulse" />}>
        <ContactsTable contacts={contacts} canEdit={hasPermission(user, "contacts.update")} />
      </Suspense>

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
