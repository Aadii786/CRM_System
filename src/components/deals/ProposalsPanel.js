"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Pencil, Send, Check, X, Trash2, ShieldCheck } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { createProposalAction, updateProposalAction, proposalStepAction } from "@/actions/proposals";
import { useToast } from "@/components/ui/Toast";
import { formatCurrencyFull, formatDate, formatDateTime } from "@/lib/utils/format";

const APPROVAL_TONE = { "Not submitted": "neutral", Pending: "warning", Approved: "success", Rejected: "danger" };
const APPROVAL_LABEL = { "Not submitted": "Not submitted", Pending: "Waiting for approval", Approved: "Approved", Rejected: "Changes requested" };

/**
 * Proposals on a deal. Sales drafts and submits; the department head
 * approves or sends it back with a reason; only an approved proposal can be
 * marked as sent, and the client's answer is recorded afterwards.
 */
export default function ProposalsPanel({ dealId, proposals, canManage, canApprove }) {
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {id,...} = edit
  const [rejecting, setRejecting] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save(formData) {
    startTransition(async () => {
      const action = editing?.id ? updateProposalAction : createProposalAction;
      const result = await action(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(null);
      push(editing?.id ? "Proposal updated." : "Proposal saved as a draft.");
      router.refresh();
    });
  }

  function step(id, name, extra = {}, message) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("dealId", dealId);
      fd.set("step", name);
      Object.entries(extra).forEach(([k, v]) => fd.set(k, v));
      const result = await proposalStepAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      if (message) push(message);
      setRejecting(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="primary" icon={Plus} onClick={() => { setError(null); setEditing({}); }}>New proposal</Button>
        </div>
      )}

      {proposals.length === 0 ? (
        <EmptyState icon={FileText} title="No proposals yet" description={canManage ? "Draft a proposal, submit it for approval, then send it to the client." : undefined} />
      ) : (
        <div className="flex flex-col gap-3">
          {proposals.map((p) => {
            const editable = p.status === "Draft";
            return (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{p.title || `${p.type} proposal`}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {p.type} proposal · drafted by {p.createdBy?.name || "unknown"} · {formatDate(p.createdAt)}
                      {p.sentDate && ` · sent ${formatDate(p.sentDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-ink tabular-nums">{formatCurrencyFull(p.value)}</span>
                    <Badge status={p.status}>{p.status}</Badge>
                    <Badge tone={APPROVAL_TONE[p.approvalStatus] || "neutral"}>{APPROVAL_LABEL[p.approvalStatus] || p.approvalStatus}</Badge>
                  </div>
                </div>

                {p.notes && <p className="mt-2 text-sm text-ink-secondary whitespace-pre-wrap">{p.notes}</p>}
                {p.approvalStatus === "Approved" && p.approvedBy && (
                  <p className="mt-2 text-xs text-ink-muted inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" /> Approved by {p.approvedBy.name} · {formatDateTime(p.approvedAt)}</p>
                )}
                {p.approvalStatus === "Rejected" && p.rejectionReason && (
                  <p className="mt-2 text-sm text-danger">Changes requested{p.approvedBy ? ` by ${p.approvedBy.name}` : ""}: {p.rejectionReason}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canManage && editable && (
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={() => { setError(null); setEditing(p); }}>Edit</Button>
                  )}
                  {canManage && editable && ["Not submitted", "Rejected"].includes(p.approvalStatus) && (
                    <Button variant="primary" size="sm" icon={Send} loading={isPending} onClick={() => step(p.id, "submit", {}, "Submitted for approval.")}>Submit for approval</Button>
                  )}
                  {canApprove && p.approvalStatus === "Pending" && (
                    <>
                      <Button variant="primary" size="sm" icon={Check} loading={isPending} onClick={() => step(p.id, "approve", {}, "Proposal approved.")}>Approve</Button>
                      <Button variant="secondary" size="sm" icon={X} onClick={() => setRejecting(p)}>Request changes</Button>
                    </>
                  )}
                  {!canApprove && p.approvalStatus === "Pending" && <span className="text-xs text-ink-muted">Waiting for the department head.</span>}
                  {canManage && p.approvalStatus === "Approved" && p.status === "Draft" && (
                    <Button variant="primary" size="sm" icon={Send} loading={isPending} onClick={() => step(p.id, "sent", {}, "Marked as sent.")}>Mark as sent</Button>
                  )}
                  {canManage && p.status === "Sent" && (
                    <>
                      <Button variant="secondary" size="sm" icon={Check} loading={isPending} onClick={() => step(p.id, "accepted", {}, "Recorded as accepted.")}>Client accepted</Button>
                      <Button variant="secondary" size="sm" icon={X} loading={isPending} onClick={() => step(p.id, "declined", {}, "Recorded as declined.")}>Client declined</Button>
                    </>
                  )}
                  {canManage && editable && (
                    <button
                      type="button"
                      title="Delete draft"
                      className="ml-auto p-1.5 rounded text-ink-muted hover:text-danger hover:bg-surface-alt"
                      onClick={() => { if (window.confirm("Delete this draft proposal?")) step(p.id, "delete", {}, "Draft deleted."); }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit proposal" : "New proposal"} description="Saved as a draft. Submit it for the department head's approval before it is sent.">
        {editing && (
          <form action={save} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            {editing.id && <input type="hidden" name="id" value={editing.id} />}
            <Field label="Title" htmlFor="pr-title" required>
              <Input id="pr-title" name="title" defaultValue={editing.title || ""} required autoFocus placeholder="e.g. Leadership program - 2 batches" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="pr-type">
                <Select id="pr-type" name="type" defaultValue={editing.type || "Initial"}>
                  <option value="Initial">Initial</option>
                  <option value="Final">Final</option>
                </Select>
              </Field>
              <Field label="Value (PKR)" htmlFor="pr-value" required>
                <Input id="pr-value" name="value" type="number" min="0" step="1000" defaultValue={editing.value ?? ""} required />
              </Field>
            </div>
            <Field label="Notes" htmlFor="pr-notes">
              <Textarea id="pr-notes" name="notes" rows={3} defaultValue={editing.notes || ""} placeholder="Scope, dates, conditions..." />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>{editing.id ? "Save changes" : "Save draft"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} title="Request changes" description={rejecting?.title}>
        {rejecting && (
          <form
            action={(fd) => step(rejecting.id, "reject", { reason: fd.get("reason") || "" }, "Sent back for changes.")}
            className="flex flex-col gap-4"
          >
            <Field label="What needs to change?" htmlFor="pr-reason" required>
              <Textarea id="pr-reason" name="reason" rows={3} required autoFocus maxLength={500} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Send back</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
