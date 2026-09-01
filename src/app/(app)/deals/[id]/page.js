import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getDealById, getDealRelated } from "@/lib/services/dealService";
import { listDocuments } from "@/lib/services/documentService";
import db from "@/lib/db";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import StageMoveSelect from "@/components/deals/StageMoveSelect";
import DocumentsPanel from "@/components/documents/DocumentsPanel";
import { formatCurrencyPKR, formatCurrencyFull, formatDate, formatDateTime } from "@/lib/utils/format";
import { GraduationCap, FileText, CreditCard } from "lucide-react";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Deal ${id}` };
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{children ?? "—"}</span>
    </div>
  );
}

export default async function DealDetailPage({ params }) {
  const user = await requireUserWithPermission("deals.view");
  const { id } = await params;

  const dealRaw = await getDealById(user, id);
  if (!dealRaw) notFound();
  const deal = dealRaw.get({ plain: true });

  const [relatedRaw, documentsRaw] = await Promise.all([
    getDealRelated(user, id),
    listDocuments(user, "deal", id),
  ]);
  const tasks = relatedRaw.tasks.map((t) => t.get({ plain: true }));
  const meetings = relatedRaw.meetings.map((m) => m.get({ plain: true }));
  const notes = relatedRaw.notes.map((n) => n.get({ plain: true }));
  const activities = relatedRaw.activities.map((a) => a.get({ plain: true }));
  const trainingPrograms = relatedRaw.trainingPrograms.map((t) => t.get({ plain: true }));
  const tnas = relatedRaw.tnas.map((t) => t.get({ plain: true }));
  const proposals = relatedRaw.proposals.map((p) => p.get({ plain: true }));
  const invoices = relatedRaw.invoices.map((i) => i.get({ plain: true }));
  const documents = documentsRaw.map((d) => d.get({ plain: true }));

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Deals", href: "/deals" }, { label: deal.name }]} />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-ink">{deal.name}</h1>
            <Badge status={deal.status}>{deal.status}</Badge>
            <StageMoveSelect dealId={deal.id} currentStageId={deal.stageId} stages={await getPipelineStages(deal.pipelineId)} />
          </div>
          <p className="text-sm text-ink-muted mt-0.5">
            {deal.Company && <Link href={`/companies/${deal.Company.id}`} className="hover:text-primary">{deal.Company.name}</Link>}
            {deal.contact && ` · ${deal.contact.firstName} ${deal.contact.lastName}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-ink tabular-nums">{formatCurrencyFull(deal.value)}</p>
          <p className="text-xs text-ink-muted">{deal.probability}% probability</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "summary", label: "Deal Summary" },
          { key: "training", label: "Training & TNA", count: trainingPrograms.length + tnas.length },
          { key: "proposals", label: "Proposals", count: proposals.length },
          { key: "financial", label: "Financial", count: invoices.length },
          { key: "activity", label: "Activity" },
          { key: "documents", label: "Documents", count: documents.length },
        ]}
      >
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink mb-2">Deal Summary</h3>
            <Row label="Owner">{deal.owner?.name}</Row>
            <Row label="Pipeline">{deal.Pipeline?.name}</Row>
            <Row label="Stage">{deal.stage?.name}</Row>
            <Row label="Source">{deal.source}</Row>
            <Row label="Training Type">{deal.trainingType}</Row>
            <Row label="Expected Close">{formatDate(deal.expectedCloseDate)}</Row>
            <Row label="Created">{formatDate(deal.createdAt)}</Row>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink mb-2">Notes</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-ink-muted">No notes yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="text-ink">{n.body}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{n.author?.name} · {formatDateTime(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2.5">Training Programs</h3>
            {trainingPrograms.length === 0 ? <EmptyState icon={GraduationCap} title="No training program yet" /> : (
              <div className="flex flex-col gap-2.5">
                {trainingPrograms.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-ink">{t.title}</p>
                      <Badge status={t.status}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted">{t.trainingType} · Trainer: {t.Trainer?.name || "TBD"} · {formatDate(t.startDate)} - {formatDate(t.endDate)}</p>
                    <p className="text-xs text-ink-muted mt-1">{t.participantsCount} participants · {t.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2.5">Training Needs Assessment (TNA)</h3>
            {tnas.length === 0 ? <EmptyState title="No TNA recorded yet" /> : (
              <div className="flex flex-col gap-2.5">
                {tnas.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-ink">{t.requirement}</p>
                      <Badge status={t.status}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-ink-secondary">{t.assessment}</p>
                    <p className="text-xs text-ink-muted mt-1">Responsible: {t.responsiblePerson}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {proposals.length === 0 ? <EmptyState icon={FileText} title="No proposals yet" /> : (
          <div className="flex flex-col gap-2.5">
            {proposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-medium text-ink">{p.type} Proposal</p>
                  <p className="text-xs text-ink-muted">Sent {formatDate(p.sentDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink tabular-nums">{formatCurrencyPKR(p.value)}</span>
                  <Badge status={p.status}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {invoices.length === 0 ? <EmptyState icon={CreditCard} title="No invoices yet" /> : (
          <div className="flex flex-col gap-2.5">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">{inv.invoiceNumber}</p>
                  <Badge status={inv.status}>{inv.status}</Badge>
                </div>
                <Row label="Amount">{formatCurrencyFull(inv.amount)}</Row>
                <Row label="Paid">{formatCurrencyFull(inv.paidAmount)}</Row>
                <Row label="Due Date">{formatDate(inv.dueDate)}</Row>
                {inv.Payments?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-ink-muted mb-1.5">Payments</p>
                    {inv.Payments.map((p) => (
                      <p key={p.id} className="text-xs text-ink-secondary">{formatCurrencyFull(p.amount)} via {p.method} on {formatDate(p.paidAt)}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activities.length === 0 ? <EmptyState title="No activity yet" /> : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => (
              <div key={a.id} className="text-sm">
                <p className="text-ink font-medium">{a.title}</p>
                <p className="text-xs text-ink-muted">{formatDateTime(a.occurredAt)}</p>
              </div>
            ))}
          </div>
        )}

        <DocumentsPanel
          relatedType="deal"
          relatedId={deal.id}
          documents={documents}
          canManage={hasPermission(user, "deals.update")}
          revalidatePathValue={`/deals/${deal.id}`}
        />
      </Tabs>
    </div>
  );
}

async function getPipelineStages(pipelineId) {
  const stages = await db.PipelineStage.findAll({ where: { pipelineId }, order: [["order", "ASC"]] });
  return stages.map((s) => s.get({ plain: true }));
}
