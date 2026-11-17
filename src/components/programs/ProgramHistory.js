import Link from "next/link";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

const ATT_TONE = { Registered: "neutral", Attended: "success", "No Show": "danger" };

function Section({ title, count, children }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-ink mb-2">{title} <span className="text-ink-muted font-normal">({count})</span></h3>
      {children}
    </div>
  );
}

/**
 * Everything a person (or a client company) has done with IKL programs: batches registered for,
 * in-house trainings attended and program inquiries. Read-only; works on server and client.
 */
export default function ProgramHistory({ history, showPerson = false }) {
  const { registrations = [], inhouse = [], inquiries = [], engagements = [] } = history;
  if (!registrations.length && !inhouse.length && !inquiries.length && !engagements.length) {
    return <EmptyState icon={GraduationCap} title="No program history yet" description="Registrations, attended trainings and program inquiries appear here." />;
  }
  return (
    <div>
      {registrations.length > 0 && (
        <Section title="Open-enrollment registrations" count={registrations.length}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <tr>{[showPerson ? "Participant" : null, "Program", "Batch", "Attendance", "Completion", "Feedback"].filter(Boolean).map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registrations.map((r) => (
                  <tr key={r.id} className={["bg-surface", r.status === "Cancelled" ? "opacity-55" : ""].join(" ")}>
                    {showPerson && <td className="px-3 py-2.5"><Link href={`/contacts/${r.contactId}`} className="font-medium text-ink hover:text-primary">{r.contact?.firstName} {r.contact?.lastName}</Link></td>}
                    <td className="px-3 py-2.5"><Link href={`/programs/${r.programId}`} className="font-medium text-ink hover:text-primary">{r.program?.title}</Link></td>
                    <td className="px-3 py-2.5 text-ink-secondary"><Link href={`/programs/${r.programId}/batches/${r.batchId}`} className="hover:text-primary">{r.batch?.code || `Batch ${r.batchId}`}</Link> · {formatDate(r.batch?.startDate)}</td>
                    <td className="px-3 py-2.5">{r.status === "Cancelled" ? <Badge tone="danger">Cancelled</Badge> : <Badge tone={ATT_TONE[r.attendance] || "neutral"}>{r.attendance}</Badge>}</td>
                    <td className="px-3 py-2.5">{r.completionStatus === "Completed" ? <><Badge tone="success">Completed</Badge>{r.certificateIssued && <span className="ml-1.5 text-xs text-ink-muted">Cert. {r.certificateNumber || "issued"}</span>}</> : <span className="text-ink-muted">{r.completionStatus}</span>}</td>
                    <td className="px-3 py-2.5 text-ink-secondary tabular-nums">{r.feedbackScore ? `${r.feedbackScore} / 5` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {inhouse.length > 0 && (
        <Section title="In-house trainings attended" count={inhouse.length}>
          <ul className="flex flex-col gap-1.5">
            {inhouse.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
                <span className="text-ink">
                  {p.TrainingProgram?.dealId ? <Link href={`/deals/${p.TrainingProgram.dealId}`} className="font-medium hover:text-primary">{p.TrainingProgram?.title}</Link> : <span className="font-medium">{p.TrainingProgram?.title}</span>}
                  <span className="text-xs text-ink-muted"> · {p.TrainingProgram?.Company?.name || "—"} · {formatDate(p.TrainingProgram?.startDate)}</span>
                </span>
                <span className="flex items-center gap-2"><Badge tone={ATT_TONE[p.attendance] || "neutral"}>{p.attendance}</Badge><Badge tone="neutral">{p.TrainingProgram?.status}</Badge></span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {engagements.length > 0 && (
        <Section title="In-house engagements for this client" count={engagements.length}>
          <ul className="flex flex-col gap-1.5">
            {engagements.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
                <span className="text-ink">
                  {e.dealId ? <Link href={`/deals/${e.dealId}`} className="font-medium hover:text-primary">{e.title}</Link> : <span className="font-medium">{e.title}</span>}
                  <span className="text-xs text-ink-muted"> · {e.trainingType} · {formatDate(e.startDate)} · {e.participantsCount || 0} participant(s){Number(e.cost) > 0 ? ` · ${formatCurrencyFull(e.cost)}` : ""}</span>
                </span>
                <Badge tone="neutral">{e.status}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {inquiries.length > 0 && (
        <Section title="Program inquiries" count={inquiries.length}>
          <ul className="flex flex-col gap-1.5">
            {inquiries.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
                <span className="text-ink"><Link href={`/deals/${d.id}`} className="font-medium hover:text-primary">{d.name}</Link><span className="text-xs text-ink-muted"> · {d.program?.title} · {formatDate(d.createdAt)}</span></span>
                <Badge tone={d.status === "won" ? "success" : d.status === "lost" ? "danger" : "info"}>{d.status}</Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
