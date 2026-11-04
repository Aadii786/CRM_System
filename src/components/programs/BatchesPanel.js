"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Trash2, CalendarDays } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { createBatchAction, updateBatchAction, deleteBatchAction } from "@/actions/programs";
import { useToast } from "@/components/ui/Toast";
import { BATCH_STATUSES } from "@/lib/constants/programs";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

const STATUS_TONE = { Planned: "neutral", "Open for registration": "info", Running: "primary", Completed: "success", Cancelled: "danger" };

/** Dated runs of a catalogue program: dates, venue, trainer, seats and fee. */
export default function BatchesPanel({ programId, defaultFee, batches, trainers, canManage }) {
  const [editing, setEditing] = useState(null); // null closed, {} new, {id,...} edit
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save(formData) {
    startTransition(async () => {
      const result = await (editing?.id ? updateBatchAction : createBatchAction)(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditing(null);
      push(editing?.id ? "Batch updated." : "Batch added.");
      router.refresh();
    });
  }

  function remove(batch) {
    if (!window.confirm("Delete this batch?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", batch.id);
      fd.set("programId", programId);
      const result = await deleteBatchAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Button variant="primary" icon={CalendarPlus} onClick={() => { setError(null); setEditing({}); }}>Add batch</Button>
        </div>
      )}

      {batches.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No batches yet" description={canManage ? "Add the first dated run of this program." : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                {["Batch", "Dates", "Venue", "Trainer", "Seats", "Fee", "Status", ""].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((b) => (
                <tr key={b.id} className="bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{b.code || `Batch ${b.id}`}</td>
                  <td className="px-4 py-3 text-ink-secondary">{formatDate(b.startDate)}{b.endDate && b.endDate !== b.startDate ? ` - ${formatDate(b.endDate)}` : ""}</td>
                  <td className="px-4 py-3 text-ink-secondary">{b.venue || "—"}</td>
                  <td className="px-4 py-3 text-ink-secondary">{b.trainer?.name || "—"}</td>
                  <td className="px-4 py-3 text-ink-secondary tabular-nums">{b.capacity ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-secondary tabular-nums">{b.fee != null ? formatCurrencyFull(b.fee) : "—"}</td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[b.status] || "neutral"}>{b.status}</Badge></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {canManage && (
                      <>
                        <button type="button" title="Edit batch" onClick={() => { setError(null); setEditing(b); }} className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"><Pencil className="size-3.5" /></button>
                        <button type="button" title="Delete batch" disabled={isPending} onClick={() => remove(b)} className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-surface-alt"><Trash2 className="size-3.5" /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit batch" : "Add batch"} description="One dated run of this program." size="lg">
        {editing && (
          <form action={save} className="flex flex-col gap-4">
            <input type="hidden" name="programId" value={programId} />
            {editing.id && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Batch code" htmlFor="bt-code" hint="e.g. LDR-2026-02">
                <Input id="bt-code" name="code" defaultValue={editing.code || ""} maxLength={60} />
              </Field>
              <Field label="Start date" htmlFor="bt-start" required>
                <Input id="bt-start" name="startDate" type="date" defaultValue={editing.startDate || ""} required />
              </Field>
              <Field label="End date" htmlFor="bt-end">
                <Input id="bt-end" name="endDate" type="date" defaultValue={editing.endDate || ""} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Venue" htmlFor="bt-venue">
                <Input id="bt-venue" name="venue" defaultValue={editing.venue || ""} maxLength={255} />
              </Field>
              <Field label="Trainer" htmlFor="bt-trainer">
                <Select id="bt-trainer" name="trainerId" defaultValue={editing.trainerId ?? ""}>
                  <option value="">Not assigned</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}{t.specialization ? ` (${t.specialization})` : ""}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Seats" htmlFor="bt-seats">
                <Input id="bt-seats" name="capacity" type="number" min="1" defaultValue={editing.capacity ?? ""} />
              </Field>
              <Field label="Fee per participant (PKR)" htmlFor="bt-fee" hint={defaultFee ? `Standard fee: ${formatCurrencyFull(defaultFee)}` : undefined}>
                <Input id="bt-fee" name="fee" type="number" min="0" step="500" defaultValue={editing.fee ?? defaultFee ?? ""} />
              </Field>
              <Field label="Status" htmlFor="bt-status">
                <Select id="bt-status" name="status" defaultValue={editing.status || "Planned"}>
                  {BATCH_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Notes" htmlFor="bt-notes">
              <Textarea id="bt-notes" name="notes" rows={2} defaultValue={editing.notes || ""} />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>{editing.id ? "Save changes" : "Add batch"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
