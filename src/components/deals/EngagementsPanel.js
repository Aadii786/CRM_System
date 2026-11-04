"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, Pencil, Trash2, UserPlus, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Field, { Input, Select } from "@/components/ui/Field";
import { createEngagementAction, updateEngagementAction, deleteEngagementAction, addParticipantAction, removeParticipantAction } from "@/actions/programs";
import { useToast } from "@/components/ui/Toast";
import { TRAINING_TYPES } from "@/lib/constants/crm";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

const STATUSES = ["Planned", "In Progress", "Completed", "Cancelled"];

/**
 * Client-specific (in-house) training engagements on a deal, and their
 * participants. Every participant is a person already in the CRM (matched by
 * email, or created) so one person keeps one record.
 */
export default function EngagementsPanel({ dealId, dealTrainingType, engagements, trainers, canManage }) {
  const [editing, setEditing] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function finish(message) {
    setError(null);
    setEditing(null);
    setAddingTo(null);
    if (message) push(message);
    router.refresh();
  }

  function saveEngagement(formData) {
    startTransition(async () => {
      const result = await (editing?.id ? updateEngagementAction : createEngagementAction)(null, formData);
      if (result?.error) setError(result.error);
      else finish(editing?.id ? "Engagement updated." : "Engagement added.");
    });
  }

  function saveParticipant(formData) {
    startTransition(async () => {
      const result = await addParticipantAction(null, formData);
      if (result?.error) setError(result.error);
      else finish(result.createdContact ? "Participant added (a new contact was created)." : "Participant added.");
    });
  }

  function act(action, fields, message, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const fd = new FormData();
      Object.entries({ ...fields, dealId }).forEach(([k, v]) => fd.set(k, v));
      const result = await action(fd);
      if (result?.error) push(result.error, { type: "error" });
      else finish(message);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Training engagements</h3>
        {canManage && <Button variant="secondary" size="sm" icon={Plus} onClick={() => { setError(null); setEditing({}); }}>Add engagement</Button>}
      </div>

      {engagements.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No training engagement yet" description={canManage ? "Record the in-house training delivered for this client: dates, venue, trainer and participants." : undefined} />
      ) : (
        engagements.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {t.trainingType} · Trainer: {t.Trainer?.name || "TBD"} · {formatDate(t.startDate)}{t.endDate ? ` - ${formatDate(t.endDate)}` : ""}{t.location ? ` · ${t.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Number(t.cost) > 0 && <span className="text-sm font-medium text-ink tabular-nums">{formatCurrencyFull(t.cost)}</span>}
                <Badge status={t.status}>{t.status}</Badge>
                {canManage && (
                  <>
                    <button type="button" title="Edit engagement" onClick={() => { setError(null); setEditing(t); }} className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"><Pencil className="size-3.5" /></button>
                    <button type="button" title="Delete engagement" disabled={isPending} onClick={() => act(deleteEngagementAction, { id: t.id }, "Engagement deleted.", "Delete this engagement?")} className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-surface-alt"><Trash2 className="size-3.5" /></button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-ink-muted">Participants ({t.participants?.length || 0})</p>
                {canManage && <Button variant="ghost" size="sm" icon={UserPlus} onClick={() => { setError(null); setAddingTo(t); }}>Add participant</Button>}
              </div>
              {t.participants?.length ? (
                <ul className="flex flex-col gap-1">
                  {t.participants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink">
                        {p.contactId ? <Link href={`/contacts/${p.contactId}`} className="hover:text-primary">{p.name}</Link> : p.name}
                        <span className="text-xs text-ink-muted">{[p.designation, p.email].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone="neutral">{p.attendance}</Badge>
                        {canManage && (
                          <button type="button" title="Remove participant" disabled={isPending} onClick={() => act(removeParticipantAction, { id: p.id }, "Participant removed.", `Remove ${p.name}?`)} className="p-1 rounded text-ink-muted hover:text-danger hover:bg-surface-alt"><X className="size-3.5" /></button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-muted">No participants recorded yet.</p>
              )}
            </div>
          </div>
        ))
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? "Edit engagement" : "Add engagement"} description="In-house training delivered for this client." size="lg">
        {editing && (
          <form action={saveEngagement} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            {editing.id && <input type="hidden" name="id" value={editing.id} />}
            <Field label="Title" htmlFor="en-title" required>
              <Input id="en-title" name="title" defaultValue={editing.title || ""} required autoFocus />
            </Field>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Training type" htmlFor="en-type">
                <Select id="en-type" name="trainingType" defaultValue={editing.trainingType || dealTrainingType || "CP"}>
                  {TRAINING_TYPES.map((t) => <option key={t.key} value={t.key}>{t.key} - {t.name}</option>)}
                </Select>
              </Field>
              <Field label="Trainer" htmlFor="en-trainer">
                <Select id="en-trainer" name="trainerId" defaultValue={editing.trainerId ?? ""}>
                  <option value="">Not assigned</option>
                  {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Field label="Status" htmlFor="en-status">
                <Select id="en-status" name="status" defaultValue={editing.status || "Planned"}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Start date" htmlFor="en-start"><Input id="en-start" name="startDate" type="date" defaultValue={editing.startDate || ""} /></Field>
              <Field label="End date" htmlFor="en-end"><Input id="en-end" name="endDate" type="date" defaultValue={editing.endDate || ""} /></Field>
              <Field label="Fee (PKR)" htmlFor="en-cost"><Input id="en-cost" name="cost" type="number" min="0" step="1000" defaultValue={editing.cost ?? ""} /></Field>
            </div>
            <Field label="Venue" htmlFor="en-loc"><Input id="en-loc" name="location" defaultValue={editing.location || ""} maxLength={255} /></Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>{editing.id ? "Save changes" : "Add engagement"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={addingTo !== null} onClose={() => setAddingTo(null)} title="Add participant" description={addingTo?.title}>
        {addingTo && (
          <form action={saveParticipant} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="engagementId" value={addingTo.id} />
            <Field label="Email" htmlFor="pt-email" required hint="An existing contact with this email is reused; otherwise a new contact is created.">
              <Input id="pt-email" name="email" type="email" required autoFocus />
            </Field>
            <Field label="Full name" htmlFor="pt-name" required>
              <Input id="pt-name" name="name" required />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Designation" htmlFor="pt-desig"><Input id="pt-desig" name="designation" maxLength={150} /></Field>
              <Field label="Phone" htmlFor="pt-phone"><Input id="pt-phone" name="phone" maxLength={40} /></Field>
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddingTo(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Add participant</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
