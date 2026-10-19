"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Banknote, Trash2 } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Field, { Input, Select } from "@/components/ui/Field";
import { createInvoiceAction, recordPaymentAction, deletePaymentAction } from "@/actions/finance";
import { useToast } from "@/components/ui/Toast";
import { formatCurrencyFull, formatDate } from "@/lib/utils/format";

const METHODS = ["Bank Transfer", "Cheque", "Cash", "Online / Card", "Other"];

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{children ?? "—"}</span>
    </div>
  );
}

/**
 * Invoice and payment references on a deal. IKL issues its invoices in the
 * finance system: here the sales team records the invoice number, amount and
 * dates, then the payments received, so the balance and revenue reports stay
 * current. Nothing is calculated or generated.
 */
export default function FinancePanel({ dealId, invoices, proposals, canManage }) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paying, setPaying] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function submit(action, message, close) {
    return (formData) => {
      startTransition(async () => {
        const result = await action(null, formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setError(null);
        close();
        push(message);
        router.refresh();
      });
    };
  }

  function removePayment(id) {
    if (!window.confirm("Remove this payment? Use this only for a payment entered by mistake.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("dealId", dealId);
      const result = await deletePaymentAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else router.refresh();
    });
  }

  const totals = invoices.reduce((t, i) => ({ billed: t.billed + Number(i.amount), paid: t.paid + Number(i.paidAmount) }), { billed: 0, paid: 0 });
  const approvedProposals = proposals.filter((p) => p.approvalStatus === "Approved");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Invoices are issued in the finance system. Record the reference here so the balance and revenue reports stay current.
        </p>
        {canManage && <Button variant="primary" icon={Plus} onClick={() => { setError(null); setInvoiceOpen(true); }}>Record invoice</Button>}
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[["Invoiced", totals.billed], ["Received", totals.paid], ["Balance", totals.billed - totals.paid]].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface p-3.5">
              <p className="text-xs text-ink-muted">{label}</p>
              <p className="text-lg font-semibold text-ink tabular-nums">{formatCurrencyFull(value)}</p>
            </div>
          ))}
        </div>
      )}

      {invoices.length === 0 ? (
        <EmptyState icon={CreditCard} title="No invoices recorded" description={canManage ? "Record the invoice number and amount from the finance system." : undefined} />
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => {
            const balance = Number(inv.amount) - Number(inv.paidAmount);
            return (
              <div key={inv.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-ink">{inv.invoiceNumber}</p>
                  <Badge status={inv.status}>{inv.status}</Badge>
                </div>
                <Row label="Amount">{formatCurrencyFull(inv.amount)}</Row>
                <Row label="Received">{formatCurrencyFull(inv.paidAmount)}</Row>
                <Row label="Balance">{formatCurrencyFull(balance)}</Row>
                <Row label="Issued">{formatDate(inv.issueDate)}</Row>
                <Row label="Due">{formatDate(inv.dueDate)}</Row>

                {inv.Payments?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-ink-muted mb-1.5">Payments</p>
                    {inv.Payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs text-ink-secondary py-0.5">
                        <span>{formatCurrencyFull(p.amount)} via {p.method}{p.reference ? ` (${p.reference})` : ""} on {formatDate(p.paidAt)}</span>
                        {canManage && (
                          <button type="button" title="Remove payment" onClick={() => removePayment(p.id)} className="p-1 rounded text-ink-muted hover:text-danger hover:bg-surface-alt">
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canManage && balance > 0 && (
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" icon={Banknote} onClick={() => { setError(null); setPaying(inv); }}>Record payment</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} title="Record invoice" description="Copy the details from the invoice issued in the finance system.">
        {invoiceOpen && (
          <form action={submit(createInvoiceAction, "Invoice recorded.", () => setInvoiceOpen(false))} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            <Field label="Invoice number" htmlFor="inv-number" required>
              <Input id="inv-number" name="invoiceNumber" required autoFocus maxLength={60} />
            </Field>
            <Field label="Amount (PKR)" htmlFor="inv-amount" required>
              <Input id="inv-amount" name="amount" type="number" min="1" step="any" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Issue date" htmlFor="inv-issue">
                <Input id="inv-issue" name="issueDate" type="date" />
              </Field>
              <Field label="Due date" htmlFor="inv-due">
                <Input id="inv-due" name="dueDate" type="date" />
              </Field>
            </div>
            {approvedProposals.length > 0 && (
              <Field label="Linked proposal" htmlFor="inv-proposal">
                <Select id="inv-proposal" name="proposalId" defaultValue="">
                  <option value="">None</option>
                  {approvedProposals.map((p) => <option key={p.id} value={p.id}>{p.title || `${p.type} proposal`} ({formatCurrencyFull(p.value)})</option>)}
                </Select>
              </Field>
            )}
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Record invoice</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={paying !== null} onClose={() => setPaying(null)} title="Record payment" description={paying ? `${paying.invoiceNumber} · balance ${formatCurrencyFull(Number(paying.amount) - Number(paying.paidAmount))}` : ""}>
        {paying && (
          <form action={submit(recordPaymentAction, "Payment recorded.", () => setPaying(null))} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="invoiceId" value={paying.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount received (PKR)" htmlFor="pay-amount" required>
                <Input id="pay-amount" name="amount" type="number" min="1" step="any" required autoFocus defaultValue={Number(paying.amount) - Number(paying.paidAmount)} />
              </Field>
              <Field label="Date received" htmlFor="pay-date" hint="Leave empty for today">
                <Input id="pay-date" name="paidAt" type="date" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method" htmlFor="pay-method">
                <Select id="pay-method" name="method" defaultValue="Bank Transfer">
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Reference" htmlFor="pay-ref" hint="Cheque or transfer number">
                <Input id="pay-ref" name="reference" maxLength={150} />
              </Field>
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Record payment</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
