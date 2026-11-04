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
import { ORGANIZATION_TYPES } from "@/lib/constants/crm";
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
  });

  function buildHref(targetPage) {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.type) params.set("type", sp.type);
    if (sp.status) params.set("status", sp.status);
    params.set("page", String(Math.max(1, targetPage)));
    return `/companies?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Corporate, government and institutional clients managed by IKL/HSM."
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
        <UrlSelect paramName="status" allLabel="All statuses" options={["Active", "Prospect", "Inactive"].map((t) => ({ value: t, label: t }))} className="w-36" />
      </FilterBar>

      <DataTable
        columns={[
          { key: "name", header: "Company", render: (c) => (
            <Link href={`/companies/${c.id}`} className="flex items-center gap-2.5 group">
              <Avatar name={c.name} size="sm" />
              <span className="font-medium text-ink group-hover:text-primary">{c.name}</span>
            </Link>
          ) },
          { key: "type", header: "Type", render: (c) => <Badge tone="neutral">{c.organizationType}</Badge> },
          { key: "location", header: "Location", render: (c) => c.city || "—" },
          { key: "status", header: "Status", render: (c) => <Badge status={c.status} /> },
          { key: "contacts", header: "Contacts", render: (c) => c.contactCount },
          { key: "deals", header: "Active Deals", render: (c) => c.activeDeals },
          { key: "owner", header: "Owner", render: (c) => c.owner?.name || "—" },
          { key: "activity", header: "Last Activity", render: (c) => formatDate(c.lastActivityAt) },
        ]}
        rows={companies}
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
