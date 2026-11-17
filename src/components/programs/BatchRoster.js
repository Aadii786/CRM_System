"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Building2, CheckCheck, Award, MessageSquareText, CreditCard, Ban, RotateCcw, Lock, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import {
  registerParticipantAction, registerNominationAction, updateRegistrationAction, cancelRegistrationAction,
  setAttendanceAction, setAttendanceBulkAction, completeRegistrationAction, reopenCompletionAction,
  completeBatchAction, recordFeedbackAction,
} from "@/actions/registrations";
import { ATTENDANCE_STATUSES, PAYMENT_STATUSES } from "@/lib/constants/programs";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

const PAY_TONE = { Unpaid: "danger", "Partially paid": "warning", Paid: "success", Waived: "neutral" };
const ATT_TONE = { Registered: "neutral", Attended: "success", "No Show": "danger" };

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="text-lg font-semibold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * The people on one batch: register (one person or a company's nominees), mark attendance,
 * record payment references, complete the program (certificate details) and capture feedback.
 */
export default function BatchRoster({ programId, batch, registrations, stats, companies, canManage }) {
  const [modal, setModal] = useState(null); // { type, reg? }
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState(null);
  const [nominationResult, setNominationResult] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  const closed = ["Cancelled", "Completed"].includes(batch.status);
  const active = useMemo(() => registrations.filter((r) => r.status !== "Cancelled"), [registrations]);
  const full = Boolean(batch.capacity) && stats.taken >= batch.capacity;

  function done(message) {
    setError(null);
    setModal(null);
    if (message) push(message);
    router.refresh();
  }

  function submit(action, formData, message, keepOpen = false) {
    startTransition(async () => {
      const result = await action(null, formData);
      if (result?.error) return setError(result.error);
      if (keepOpen) {
        router.refresh();
        return result;
      }
      done(typeof message === "function" ? message(result) : message);
    });
  }

  function direct(action, fields, message, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      const fd = new FormData();
      Object.entries({ programId, batchId: batch.id, ...fields }).forEach(([k, v]) => fd.set(k, v));
      const result = await action(fd);
      if (result?.error) push(result.error, { type: "error" });
      else {
        if (message) push(typeof message === "function" ? message(result) : message);
        router.refresh();
      }
    });
  }

  const allIds = active.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Tile label="Seats" value={batch.capacity ? `${stats.taken} / ${batch.capacity}` : stats.taken} sub={full ? "Batch is full" : batch.capacity ? `${batch.capacity - stats.taken} left` : "No seat limit set"} />
        <Tile label="Attended" value={stats.attended} sub={stats.noShow ? `${stats.noShow} no-show` : undefined} />
        <Tile label="Completed" value={stats.completed} sub={stats.certificates ? `${stats.certificates} certificate(s) recorded` : undefined} />
        <Tile label="Feedback" value={stats.feedbackAverage != null ? `${stats.feedbackAverage} / 5` : "—"} sub={stats.feedbackCount ? `${stats.feedbackCount} response(s)` : "No feedback yet"} />
        <Tile label="Fees" value={formatCurrencyFull(stats.paid)} sub={`of ${formatCurrencyFull(stats.expected)} expected`} />
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" icon={UserPlus} disabled={closed} onClick={() => { setError(null); setModal({ type: "register" }); }}>Register participant</Button>
          <Button variant="secondary" icon={Building2} disabled={closed} onClick={() => { setError(null); setNominationResult(null); setModal({ type: "nomination" }); }}>Company nomination</Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="secondary" size="sm" icon={CheckCheck} disabled={!selected.size || isPending} onClick={() => direct(setAttendanceBulkAction, { ids: [...selected].join(","), attendance: "Attended" }, (r) => `${r.updated} marked Attended.`)}>Mark selected Attended</Button>
          <Button variant="secondary" size="sm" disabled={!selected.size || isPending} onClick={() => direct(setAttendanceBulkAction, { ids: [...selected].join(","), attendance: "No Show" }, (r) => `${r.updated} marked No Show.`)}>Mark selected No Show</Button>
          <Button variant="secondary" size="sm" icon={Lock} disabled={batch.status === "Completed" || !stats.attended || isPending} onClick={() => direct(completeBatchAction, {}, (r) => `Batch closed: ${r.completed} completed, ${r.newAlumni} new alumni.`, "Close this batch? Everyone marked Attended becomes Completed and an alumnus. Certificate numbers can still be added per person.")}>Close batch</Button>
        </div>
      )}
      {closed && canManage && <p className="text-xs text-ink-muted">This batch is {batch.status.toLowerCase()}, so new registrations are closed. Attendance, payments, certificates and feedback can still be updated.</p>}

      {registrations.length === 0 ? (
        <EmptyState icon={Users} title="No registrations yet" description={canManage ? "Register the first participant, or wait for the website registration form." : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                {canManage && <th className="px-3 py-2.5 w-8"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} /></th>}
                {["Participant", "Company", "Attendance", "Payment", "Completion", "Feedback", ""].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registrations.map((r) => {
                const cancelled = r.status === "Cancelled";
                return (
                  <tr key={r.id} className={["bg-surface", cancelled ? "opacity-55" : ""].join(" ")}>
                    {canManage && <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${r.contact?.firstName}`} disabled={cancelled} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>}
                    <td className="px-3 py-3">
                      <Link href={`/contacts/${r.contactId}`} className="font-medium text-ink hover:text-primary">{r.contact?.firstName} {r.contact?.lastName}</Link>
                      <p className="text-xs text-ink-muted">{[r.contact?.email, r.source !== "Manual" ? r.source : null].filter(Boolean).join(" · ")}</p>
                      {cancelled && <Badge tone="danger">Cancelled</Badge>}
                      {r.contact?.isAlumnus && !cancelled && <Badge tone="purple">Alumnus</Badge>}
                    </td>
                    <td className="px-3 py-3 text-ink-secondary">{r.company ? <Link href={`/companies/${r.company.id}`} className="hover:text-primary">{r.company.name}</Link> : "—"}</td>
                    <td className="px-3 py-3">
                      {canManage && !cancelled ? (
                        <Select aria-label="Attendance" value={r.attendance} disabled={isPending} onChange={(e) => direct(setAttendanceAction, { id: r.id, attendance: e.target.value }, null)} className="w-32 h-8 text-xs">
                          {ATTENDANCE_STATUSES.map((a) => <option key={a}>{a}</option>)}
                        </Select>
                      ) : <Badge tone={ATT_TONE[r.attendance] || "neutral"}>{r.attendance}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={PAY_TONE[r.paymentStatus] || "neutral"}>{r.paymentStatus}</Badge>
                      <p className="text-xs text-ink-muted tabular-nums mt-0.5">{formatCurrencyFull(r.amountPaid)} / {formatCurrencyFull(r.fee)}{r.invoiceNumber ? ` · ${r.invoiceNumber}` : ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      {r.completionStatus === "Completed" ? (
                        <>
                          <Badge tone="success">Completed</Badge>
                          <p className="text-xs text-ink-muted mt-0.5">{r.certificateIssued ? `Certificate ${r.certificateNumber || "issued"}${r.certificateDate ? ` · ${formatDate(r.certificateDate)}` : ""}` : "No certificate recorded"}</p>
                        </>
                      ) : <Badge tone={r.completionStatus === "Not completed" ? "danger" : "neutral"}>{r.completionStatus}</Badge>}
                    </td>
                    <td className="px-3 py-3 text-ink-secondary">
                      {r.feedbackScore ? <span title={r.feedbackComments || undefined} className="tabular-nums">{r.feedbackScore} / 5</span> : "—"}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {canManage && (
                        <>
                          <button type="button" title="Payment details" onClick={() => { setError(null); setModal({ type: "payment", reg: r }); }} className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"><CreditCard className="size-3.5" /></button>
                          {!cancelled && r.attendance === "Attended" && r.completionStatus !== "Completed" && (
                            <button type="button" title="Complete program / record certificate" onClick={() => { setError(null); setModal({ type: "complete", reg: r }); }} className="p-1.5 rounded text-ink-muted hover:text-success hover:bg-surface-alt"><Award className="size-3.5" /></button>
                          )}
                          {r.completionStatus === "Completed" && (
                            <>
                              <button type="button" title="Edit certificate details" onClick={() => { setError(null); setModal({ type: "complete", reg: r }); }} className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"><Award className="size-3.5" /></button>
                              <button type="button" title="Undo completion" disabled={isPending} onClick={() => direct(reopenCompletionAction, { id: r.id }, "Completion undone.", "Undo completion? The certificate details are cleared and the alumnus flag is recalculated.")} className="p-1.5 rounded text-ink-muted hover:text-warning hover:bg-surface-alt"><RotateCcw className="size-3.5" /></button>
                            </>
                          )}
                          {!cancelled && (
                            <button type="button" title="Feedback" onClick={() => { setError(null); setModal({ type: "feedback", reg: r }); }} className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"><MessageSquareText className="size-3.5" /></button>
                          )}
                          {cancelled ? (
                            <button type="button" title="Reactivate registration" disabled={isPending} onClick={() => direct(cancelRegistrationAction, { id: r.id, status: "Registered" }, "Registration reactivated.")} className="p-1.5 rounded text-ink-muted hover:text-success hover:bg-surface-alt"><RotateCcw className="size-3.5" /></button>
                          ) : (
                            <button type="button" title="Cancel registration" disabled={isPending} onClick={() => direct(cancelRegistrationAction, { id: r.id, status: "Cancelled" }, "Registration cancelled. The seat is free again.", `Cancel the registration of ${r.contact?.firstName} ${r.contact?.lastName}? The seat becomes free.`)} className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-surface-alt"><Ban className="size-3.5" /></button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Register one person */}
      <Modal open={modal?.type === "register"} onClose={() => setModal(null)} title="Register a participant" description={`${batch.code || "Batch"} — the person is matched by email so they stay one record.`} size="lg">
        <form action={(fd) => submit(registerParticipantAction, fd, (r) => (r.createdContact ? "Registered (a new contact was created)." : "Registered."))} className="flex flex-col gap-4">
          <input type="hidden" name="batchId" value={batch.id} />
          <input type="hidden" name="programId" value={programId} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name" htmlFor="rg-name" required><Input id="rg-name" name="name" required autoFocus /></Field>
            <Field label="Email" htmlFor="rg-email" required><Input id="rg-email" name="email" type="email" required /></Field>
            <Field label="Phone" htmlFor="rg-phone"><Input id="rg-phone" name="phone" /></Field>
            <Field label="Designation" htmlFor="rg-desig"><Input id="rg-desig" name="designation" /></Field>
            <Field label="Company (if nominated)" htmlFor="rg-company">
              <Select id="rg-company" name="companyId" defaultValue="">
                <option value="">Individual / not linked</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Fee (PKR)" htmlFor="rg-fee" hint={batch.fee != null ? `Batch fee: ${formatCurrencyFull(batch.fee)}` : undefined}>
              <Input id="rg-fee" name="fee" type="number" min="0" step="500" defaultValue={batch.fee ?? ""} />
            </Field>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Register</Button>
          </div>
        </form>
      </Modal>

      {/* Company nomination */}
      <Modal open={modal?.type === "nomination"} onClose={() => setModal(null)} title="Company nomination" description="A company nominates several people for this batch." size="lg">
        {nominationResult ? (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-ink"><strong>{nominationResult.registered}</strong> registered under reference <span className="font-mono">{nominationResult.reference}</span>.</p>
            {nominationResult.skipped?.length > 0 && (
              <div className="rounded-md border border-warning-border bg-warning-subtle p-3">
                <p className="font-medium text-warning mb-1">{nominationResult.skipped.length} could not be registered:</p>
                <ul className="list-disc pl-5 text-ink-secondary">{nominationResult.skipped.map((s) => <li key={s.line}>{s.name}: {s.reason}</li>)}</ul>
              </div>
            )}
            <div className="flex justify-end"><Button variant="primary" onClick={() => { setNominationResult(null); done(); }}>Done</Button></div>
          </div>
        ) : (
          <form
            action={(fd) => startTransition(async () => {
              const result = await registerNominationAction(null, fd);
              if (result?.error) setError(result.error);
              else { setError(null); setNominationResult(result); router.refresh(); }
            })}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="programId" value={programId} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nominating company" htmlFor="nm-company" required>
                <Select id="nm-company" name="companyId" required defaultValue="">
                  <option value="" disabled>Choose a company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Fee per person (PKR)" htmlFor="nm-fee" hint={batch.fee != null ? `Batch fee: ${formatCurrencyFull(batch.fee)}` : undefined}>
                <Input id="nm-fee" name="fee" type="number" min="0" step="500" defaultValue={batch.fee ?? ""} />
              </Field>
            </div>
            <Field label="Nominees" htmlFor="nm-people" required hint="One person per line: Name, email, designation, phone (designation and phone are optional).">
              <Textarea id="nm-people" name="people" rows={6} required placeholder={"Ayesha Khan, ayesha@company.com, HR Manager, 0300 1234567\nBilal Ahmed, bilal@company.com"} />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Register nominees</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Payment reference */}
      <Modal open={modal?.type === "payment"} onClose={() => setModal(null)} title="Fee and payment" description="IKL's finance system issues the invoice; the CRM records the reference and what was received." size="md">
        {modal?.type === "payment" && (
          <form action={(fd) => submit(updateRegistrationAction, fd, "Payment details saved.")} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={modal.reg.id} />
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="programId" value={programId} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Fee (PKR)" htmlFor="py-fee"><Input id="py-fee" name="fee" type="number" min="0" step="500" defaultValue={modal.reg.fee} /></Field>
              <Field label="Amount received (PKR)" htmlFor="py-paid"><Input id="py-paid" name="amountPaid" type="number" min="0" step="500" defaultValue={modal.reg.amountPaid} /></Field>
              <Field label="Payment status" htmlFor="py-status">
                <Select id="py-status" name="paymentStatus" defaultValue={modal.reg.paymentStatus}>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
              </Field>
              <Field label="Invoice number" htmlFor="py-inv"><Input id="py-inv" name="invoiceNumber" defaultValue={modal.reg.invoiceNumber || ""} maxLength={60} /></Field>
            </div>
            <Field label="Notes" htmlFor="py-notes"><Textarea id="py-notes" name="notes" rows={2} defaultValue={modal.reg.notes || ""} /></Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Save</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Complete + certificate record */}
      <Modal open={modal?.type === "complete"} onClose={() => setModal(null)} title="Complete the program" description="Completing makes the person an alumnus. The CRM only records the certificate; the certificate itself is produced by IKL." size="md">
        {modal?.type === "complete" && (
          <form action={(fd) => submit(completeRegistrationAction, fd, "Program completed. The person is now an alumnus.")} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={modal.reg.id} />
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="programId" value={programId} />
            <p className="text-sm text-ink">{modal.reg.contact?.firstName} {modal.reg.contact?.lastName}</p>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" name="certificateIssued" defaultChecked={modal.reg.certificateIssued} /> A certificate was issued</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Certificate number" htmlFor="ct-no"><Input id="ct-no" name="certificateNumber" defaultValue={modal.reg.certificateNumber || ""} maxLength={60} /></Field>
              <Field label="Issued on" htmlFor="ct-date"><Input id="ct-date" name="certificateDate" type="date" defaultValue={modal.reg.certificateDate || ""} /></Field>
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>{modal.reg.completionStatus === "Completed" ? "Save certificate" : "Mark completed"}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Feedback */}
      <Modal open={modal?.type === "feedback"} onClose={() => setModal(null)} title="Program feedback" description="Score from 1 (poor) to 5 (excellent) and any comments." size="md">
        {modal?.type === "feedback" && (
          <form action={(fd) => submit(recordFeedbackAction, fd, "Feedback saved.")} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={modal.reg.id} />
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="programId" value={programId} />
            <p className="text-sm text-ink">{modal.reg.contact?.firstName} {modal.reg.contact?.lastName}</p>
            <Field label="Score" htmlFor="fb-score" required>
              <Select id="fb-score" name="score" defaultValue={modal.reg.feedbackScore || ""} required>
                <option value="" disabled>Choose</option>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Comments" htmlFor="fb-comments"><Textarea id="fb-comments" name="comments" rows={3} defaultValue={modal.reg.feedbackComments || ""} /></Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Save feedback</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
