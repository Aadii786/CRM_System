import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getCompanyById, getCompanyRelated } from "@/lib/services/companyService";
import { listDocuments } from "@/lib/services/documentService";
import { getCompanyHierarchy } from "@/lib/services/listService";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import DocumentsPanel from "@/components/documents/DocumentsPanel";
import { Pencil, Building2, Handshake, GraduationCap, FolderOpen } from "lucide-react";
import { formatDate, formatDateTime, formatCurrencyPKR } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Company ${id}` };
}

export default async function CompanyDetailPage({ params }) {
  const user = await requireUserWithPermission("companies.view");
  const { id } = await params;

  const companyRaw = await getCompanyById(user, id);
  if (!companyRaw) notFound();
  const company = companyRaw.get({ plain: true });

  const canSeeLists = hasPermission(user, "lists.view");
  const [relatedRaw, documentsRaw, foldersRaw] = await Promise.all([
    getCompanyRelated(user, id),
    listDocuments(user, "company", id),
    canSeeLists ? getCompanyHierarchy(user, id) : Promise.resolve([]),
  ]);
  const contacts = relatedRaw.contacts.map((c) => c.get({ plain: true }));
  const deals = relatedRaw.deals.map((d) => d.get({ plain: true }));
  const tasks = relatedRaw.tasks.map((t) => t.get({ plain: true }));
  const meetings = relatedRaw.meetings.map((m) => m.get({ plain: true }));
  const trainingPrograms = relatedRaw.trainingPrograms.map((t) => t.get({ plain: true }));
  const activities = relatedRaw.activities.map((a) => a.get({ plain: true }));
  const documents = documentsRaw.map((d) => d.get({ plain: true }));
  const folders = foldersRaw.map((f) => f.get({ plain: true }));

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Companies", href: "/companies" }, { label: company.name }]} />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <Avatar name={company.name} size="lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-ink">{company.name}</h1>
              <Badge status={company.status} />
            </div>
            <p className="text-sm text-ink-muted mt-0.5">{company.organizationType} · {company.industry || "—"} · {company.city}</p>
          </div>
        </div>
        <Button href={`/companies/${id}/edit`} variant="secondary" icon={Pencil}>Edit</Button>
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "contacts", label: "Contacts", count: contacts.length },
          { key: "deals", label: "Deals", count: deals.length },
          { key: "folders", label: "Folders & Lists", count: folders.length },
          { key: "training", label: "Training Programs", count: trainingPrograms.length },
          { key: "activity", label: "Activity" },
          { key: "tasks-meetings", label: "Tasks & Meetings" },
          { key: "documents", label: "Documents", count: documents.length },
        ]}
      >
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Company Information</h3>
            <OverviewRow label="Website">{company.website ? <a href={company.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{company.website}</a> : "—"}</OverviewRow>
            <OverviewRow label="Email">{company.email || "—"}</OverviewRow>
            <OverviewRow label="Phone">{company.phone || "—"}</OverviewRow>
            <OverviewRow label="Address">{[company.address, company.city, company.country].filter(Boolean).join(", ") || "—"}</OverviewRow>
            <OverviewRow label="Lead Source">{company.leadSource}</OverviewRow>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">CRM Details</h3>
            <OverviewRow label="Owner">{company.owner?.name || "Unassigned"}</OverviewRow>
            <OverviewRow label="Department">{company.Department ? <Badge department={company.Department.key}>{company.Department.name}</Badge> : "—"}</OverviewRow>
            <OverviewRow label="Created">{formatDate(company.createdAt)}</OverviewRow>
            <OverviewRow label="Last Activity">{formatDate(company.lastActivityAt)}</OverviewRow>
          </div>
        </div>

        {contacts.length === 0 ? (
          <EmptyState title="No contacts yet" description="Contacts at this company will appear here." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((c) => (
              <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 hover:border-primary-border transition-colors">
                <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                <div>
                  <p className="text-sm font-medium text-ink">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-ink-muted">{c.jobTitle || c.email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {deals.length === 0 ? (
          <EmptyState icon={Handshake} title="No deals yet" description="Deals for this company will appear here." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {deals.map((d) => (
              <Link key={d.id} href={`/deals/${d.id}`} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3.5 hover:border-primary-border transition-colors">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{d.name}</span>
                  {d.referenceNumber && <span className="text-[11px] font-mono text-ink-muted">{d.referenceNumber}</span>}
                </span>
                <span className="flex items-center gap-2.5 shrink-0">
                  <Badge tone="neutral">{d.stage?.name}</Badge>
                  <span className="text-sm text-ink-secondary tabular-nums">{formatCurrencyPKR(d.value)}</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        {!canSeeLists ? (
          <EmptyState icon={FolderOpen} title="Not available" description="You don't have permission to view lists." />
        ) : folders.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No folders yet"
            description="Organize this company's contacts into Folders and Lists (Company → Folder → List → Contact)."
            action={<Button href="/folders" variant="primary" icon={FolderOpen}>Go to Folders</Button>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {folders.map((f) => (
              <div key={f.id} className="rounded-lg border border-border bg-surface p-4">
                <Link href={`/folders/${f.id}`} className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-primary mb-2.5">
                  <FolderOpen className="size-4 text-primary" /> {f.name}
                </Link>
                {f.lists.length === 0 ? (
                  <p className="text-xs text-ink-muted pl-6">No lists in this folder yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 pl-6">
                    {f.lists.map((l) => (
                      <li key={l.id} className="flex items-center justify-between text-sm">
                        <Link href={`/lists/${l.id}`} className="text-primary hover:underline">{l.name}</Link>
                        <span className="text-ink-muted tabular-nums">{l.contactCount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {trainingPrograms.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No training programs yet" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {trainingPrograms.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3.5">
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-muted">{t.trainingType} · {formatDate(t.startDate)} - {formatDate(t.endDate)}</p>
                </div>
                <Badge status={t.status}>{t.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {activities.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <div key={a.id} className="text-sm">
                <p className="text-ink font-medium">{a.title}</p>
                <p className="text-xs text-ink-muted">{formatDateTime(a.occurredAt)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2.5">Tasks</h3>
            {tasks.length === 0 ? <EmptyState title="No tasks" /> : (
              <ul className="flex flex-col gap-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm rounded-lg border border-border p-3">
                    <span>{t.title}</span>
                    <Badge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2.5">Meetings</h3>
            {meetings.length === 0 ? <EmptyState title="No meetings" /> : (
              <ul className="flex flex-col gap-2">
                {meetings.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm rounded-lg border border-border p-3">
                    <span>{m.title}</span>
                    <span className="text-xs text-ink-muted">{formatDateTime(m.startAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DocumentsPanel
          relatedType="company"
          relatedId={company.id}
          documents={documents}
          canManage={hasPermission(user, "companies.update")}
          revalidatePathValue={`/companies/${company.id}`}
        />
      </Tabs>
    </div>
  );
}

function OverviewRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{children}</span>
    </div>
  );
}
