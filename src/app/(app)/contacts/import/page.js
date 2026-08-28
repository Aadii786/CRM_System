import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listImports } from "@/lib/services/importService";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import ImportWizard from "@/components/contacts/ImportWizard";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Import Contacts" };

export default async function ImportContactsPage() {
  const user = await requireUserWithPermission("contacts.import");
  const importsRaw = await listImports(user, 10);
  const imports = importsRaw.map((i) => i.get({ plain: true }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Contacts", href: "/contacts" }, { label: "Import" }]}
        title="Import Contacts"
        description="Enterprise-grade CSV import: upload, map fields, validate, detect duplicates, then import."
      />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <ImportWizard departmentKey={user.department?.key} />

        <Card padding="none">
          <div className="p-5 pb-0">
            <CardHeader title="Import History" description="Your most recent CSV imports." />
          </div>
          {imports.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState title="No imports yet" description="Completed imports will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {imports.map((imp) => (
                <div key={imp.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink truncate">{imp.filename}</p>
                    <Badge status={imp.status === "completed" ? "Sent" : imp.status}>{imp.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {imp.importedRows.toLocaleString()} imported · {imp.duplicateRows.toLocaleString()} duplicates · {imp.invalidRows.toLocaleString()} invalid
                  </p>
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
