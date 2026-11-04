import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listImports } from "@/lib/services/importService";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import CompanyImportWizard from "@/components/companies/CompanyImportWizard";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Import Companies" };

export default async function ImportCompaniesPage() {
  const user = await requireUserWithPermission("companies.create");
  const imports = (await listImports(user, 10, "companies")).map((i) => i.get({ plain: true }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: "Import" }]}
        title="Import Companies"
        description="Load corporate clients from an Excel or CSV file: match the columns, see duplicates, import."
      />
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <CompanyImportWizard departmentKey={user.department?.key} />
        <Card padding="none">
          <div className="p-5 pb-0"><CardHeader title="Import history" description="Your most recent company imports." /></div>
          {imports.length === 0 ? (
            <div className="p-5 pt-0"><EmptyState title="No imports yet" description="Completed imports appear here." /></div>
          ) : (
            <div className="divide-y divide-border">
              {imports.map((imp) => (
                <div key={imp.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink truncate">{imp.filename}</p>
                    <Badge status={imp.status === "completed" ? "Sent" : imp.status}>{imp.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">{imp.importedRows.toLocaleString()} imported · {imp.duplicateRows.toLocaleString()} duplicates · {imp.invalidRows.toLocaleString()} invalid</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">{formatDateTime(imp.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
