import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listPrograms } from "@/lib/services/programService";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import SearchInput from "@/components/ui/SearchInput";
import UrlSelect from "@/components/ui/UrlSelect";
import Pagination from "@/components/ui/Pagination";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ProgramFormModal from "@/components/programs/ProgramFormModal";
import { GraduationCap } from "lucide-react";
import { PROGRAM_CATEGORIES, PROGRAM_TYPES } from "@/lib/constants/programs";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

export const metadata = { title: "Programs" };

export default async function ProgramsPage({ searchParams }) {
  const user = await requireUserWithPermission("programs.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status === "all" ? "" : sp.status || "Active";
  const canManage = hasPermission(user, "training.manage");

  const { data: programs, pagination } = await listPrograms(user, {
    page, limit: 25, q: sp.q || "", category: sp.category || undefined, programType: sp.type || undefined, status,
  });

  function buildHref(targetPage) {
    const params = new URLSearchParams();
    for (const k of ["q", "category", "type", "status"]) if (sp[k]) params.set(k, sp[k]);
    params.set("page", String(Math.max(1, targetPage)));
    return `/programs?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Programs"
        description="The program catalogue: what is offered, in which category, and when it runs next."
        actions={canManage && <ProgramFormModal />}
      />

      <FilterBar>
        <SearchInput placeholder="Search title or code..." />
        <UrlSelect paramName="category" allLabel="All categories" options={PROGRAM_CATEGORIES.map((c) => ({ value: c, label: c }))} className="w-64" />
        <UrlSelect paramName="type" allLabel="All types" options={PROGRAM_TYPES.map((t) => ({ value: t, label: t }))} className="w-48" />
        <UrlSelect paramName="status" allLabel="Active" options={[{ value: "Archived", label: "Archived" }, { value: "all", label: "Active and archived" }]} className="w-44" />
      </FilterBar>

      <DataTable
        columns={[
          { key: "title", header: "Program", render: (p) => (
            <Link href={`/programs/${p.id}`} className="block group">
              <span className="font-medium text-ink group-hover:text-primary">{p.title}</span>
              {p.code && <span className="block text-[11px] font-mono text-ink-muted">{p.code}</span>}
            </Link>
          ) },
          { key: "category", header: "Category", render: (p) => p.category || "—" },
          { key: "type", header: "Type", render: (p) => <Badge tone={p.programType === "In-house" ? "purple" : p.programType === "Certificate program" ? "teal" : "blue"}>{p.programType}</Badge> },
          { key: "duration", header: "Duration", render: (p) => p.durationText || (p.durationDays ? `${p.durationDays} day${p.durationDays > 1 ? "s" : ""}` : "—") },
          { key: "fee", header: "Fee", render: (p) => (Number(p.defaultFee) ? formatCurrencyFull(p.defaultFee) : "—") },
          { key: "batches", header: "Batches", render: (p) => p.batchCount },
          { key: "next", header: "Next batch", render: (p) => (p.nextStart ? formatDate(p.nextStart) : "—") },
          { key: "interest", header: "Interested leads", render: (p) => p.interestedCount },
          { key: "status", header: "Status", render: (p) => <Badge tone={p.status === "Active" ? "success" : "neutral"}>{p.status}</Badge> },
        ]}
        rows={programs}
        emptyState={<EmptyState icon={GraduationCap} tone="cyan" title="No programs yet" description={canManage ? "Add the first program to start the catalogue." : "The catalogue is empty."} action={canManage && <ProgramFormModal />} />}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
