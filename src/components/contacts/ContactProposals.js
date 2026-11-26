import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { FileText } from "lucide-react";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

/** Proposals on this person's deals: what was offered, its value and where it stands. Read-only; proposals are managed on the deal. */
export default function ContactProposals({ proposals = [] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2"><FileText className="size-4 text-primary" aria-hidden="true" /> Proposals <span className="text-ink-muted font-normal">({proposals.length})</span></h3>
      {proposals.length === 0 ? (
        <p className="text-sm text-ink-muted rounded-lg border border-border bg-surface px-4 py-3">No proposals yet. They are created on the opportunity (Deals).</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>{["Proposal", "Opportunity", "Value", "Sent", "Status"].map((h) => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {proposals.map((p) => (
                <tr key={p.id} className="bg-surface">
                  <td className="px-3 py-2.5 font-medium text-ink">{p.title || `${p.type} proposal`}</td>
                  <td className="px-3 py-2.5"><Link href={`/deals/${p.Deal?.id}`} className="text-primary hover:underline">{p.Deal?.referenceNumber || p.Deal?.name}</Link></td>
                  <td className="px-3 py-2.5 tabular-nums">{formatCurrencyFull(p.value)}</td>
                  <td className="px-3 py-2.5 text-ink-secondary">{p.sentDate ? formatDate(p.sentDate) : "—"}</td>
                  <td className="px-3 py-2.5"><Badge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
