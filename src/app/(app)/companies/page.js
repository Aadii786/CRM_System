import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getCompanies } from "@/lib/services/companyService";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import SearchInput from "@/components/ui/SearchInput";
import UrlSelect from "@/components/ui/UrlSelect";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Building2, Plus, Upload } from "lucide-react";
import { ORGANIZATION_TYPES, COMPANY_INDUSTRIES } from "@/lib/constants/crm";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Companies" };

export default async function CompaniesPage({ searchParams }) {
  const user = await requireUserWithPermission("companies.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: companies, pagination } = await getCompanies(user, {
    page,
    limit: 25,
    q: sp.q || "",
    organizationType: sp.type || undefined,
    status: sp.status || undefined,
    industry: sp.industry || undefined,
    sort: sp.sort || undefined,
    dir: sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : undefined,
  });
  const dir = sp.dir === "asc" ? "asc" : "desc";

  // Clicking a header sorts by it; clicking the same header again flips the direction.
  function sortHref(key) {
    const params = new URLSearchParams();
    for (const k of ["q", "type", "status", "industry"]) if (sp[k]) params.set(k, sp[k]);
    params.set("sort", key);
    params.set("dir", sp.sort === key && dir === "asc" ? "desc" : "asc");
    return `/companies?${params.toString()}`;
  }

  function buildHref(targetPage) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.type) params.set("type", sp.type);
    if (sp.status) params.set("status", sp.status);
    if (sp.industry) params.set("industry", sp.industry);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.dir) params.set("dir", sp.dir);
    params.set("page", String(Math.max(1, targetPage)));
    return `/companies?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Corporate, government and institutional clients managed by IKL."
        actions={hasPermission(user, "companies.create") && (
          <>
            <Button href="/companies/import" variant="secondary" icon={Upload}>Import</Button>
            <Button href="/companies/new" variant="primary" icon={Plus}>Create Company</Button>
          </>
        )}
      />

      <FilterBar>
        <SearchInput placeholder="Search companies..." />
        <UrlSelect paramName="type" allLabel="All types" options={ORGANIZATION_TYPES.map((t) => ({ value: t, label: t }))} className="w-44" />
        <UrlSelect paramName="industry" allLabel="All industries" options={COMPANY_INDUSTRIES.map((t) => ({ value: t, label: t }))} className="w-56" />
        <UrlSelect paramName="status" allLabel="All statuses" options={["Active", "Prospect", "Inactive"].map((t) => ({ value: t, label: t }))} className="w-36" />
      </FilterBar>

      <DataTable
        columns={[
          { key: "name", header: "Company", sortKey: "name", render: (c) => (
            <Link href={`/companies/${c.id}`} className="flex items-center gap-2.5 group">
              <Avatar name={c.name} size="sm" />
              <span className="font-medium text-ink group-hover:text-primary">{c.name}</span>
            </Link>
          ) },
          { key: "type", header: "Type", sortKey: "type", render: (c) => <Badge tone="neutral">{c.organizationType}</Badge> },
          { key: "industry", header: "Industry", sortKey: "industry", render: (c) => c.industry || "—" },
          { key: "location", header: "Location", sortKey: "location", render: (c) => c.city || "—" },
          { key: "status", header: "Status", sortKey: "status", render: (c) => <Badge status={c.status} /> },
          { key: "contacts", header: "Contacts", sortKey: "contacts", render: (c) => (c.contactCount ? <Link href={`/contacts?company=${c.id}`} className="text-primary hover:underline tabular-nums">{c.contactCount}</Link> : 0) },
          { key: "deals", header: "Active Deals", sortKey: "deals", render: (c) => (c.activeDeals ? <Link href={`/deals?company=${c.id}&status=open`} className="text-primary hover:underline tabular-nums">{c.activeDeals}</Link> : 0) },
          { key: "owner", header: "Owner", sortKey: "owner", render: (c) => c.owner?.name || "—" },
          { key: "activity", header: "Last Activity", sortKey: "activity", render: (c) => formatDate(c.lastActivityAt) },
        ]}
        rows={companies}
        sort={sp.sort}
        dir={dir}
        sortHref={sortHref}
        emptyState={
          <EmptyState
            icon={Building2}
            tone="cyan"
            title="No companies found"
            description="Add your first company to start tracking B2B relationships."
            action={hasPermission(user, "companies.create") && <Button href="/companies/new" variant="primary" icon={Plus}>Create Company</Button>}
          />
        }
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
