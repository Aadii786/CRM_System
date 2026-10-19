import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Invoice, Payment, Deal, Department, Activity } = db;

/**
 * Invoice and payment REFERENCES. IKL issues its invoices in the finance
 * system; the CRM only records the reference against a deal (number, date,
 * amount, due date) and the payments received, so sales can see the
 * balance and revenue reports stay current. No tax is calculated and no
 * invoice document is produced here.
 */

const PAYMENT_METHODS = ["Bank Transfer", "Cheque", "Cash", "Online / Card", "Other"];

async function loadDeal(user, dealId) {
  const deal = await Deal.findByPk(dealId, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);
  return deal;
}

async function loadInvoice(user, id) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw new Error("Invoice not found.");
  const deal = await loadDeal(user, invoice.dealId);
  return { invoice, deal };
}

function money(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Enter a ${label} greater than zero.`);
  return Math.round(n * 100) / 100;
}

function dateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Enter a valid date.");
  return s;
}

/** Unpaid / Partial / Paid, and Overdue when money is still owed past the due date. */
export function deriveInvoiceStatus({ amount, paidAmount, dueDate }) {
  const total = Number(amount);
  const paid = Number(paidAmount || 0);
  if (paid >= total) return "Paid";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate && String(dueDate).slice(0, 10) < today) return "Overdue";
  return paid > 0 ? "Partial" : "Unpaid";
}

export function paymentMethods() {
  return PAYMENT_METHODS;
}

export async function createInvoice(user, dealId, payload) {
  requirePermission(user, "invoices.manage");
  const deal = await loadDeal(user, dealId);

  const invoiceNumber = String(payload.invoiceNumber || "").trim();
  if (!invoiceNumber) throw new Error("Enter the invoice number from the finance system.");
  if (invoiceNumber.length > 60) throw new Error("The invoice number is too long.");
  const clash = await Invoice.findOne({ where: { invoiceNumber } });
  if (clash) throw new Error(`Invoice ${invoiceNumber} is already recorded.`);
  const amount = money(payload.amount, "invoice amount");

  const issueDate = dateOnly(payload.issueDate) || new Date().toISOString().slice(0, 10);
  const dueDate = dateOnly(payload.dueDate);
  const proposalId = payload.proposalId ? Number(payload.proposalId) : null;

  const invoice = await Invoice.create({
    dealId: deal.id,
    proposalId,
    invoiceNumber,
    amount,
    paidAmount: 0,
    issueDate,
    dueDate,
    status: deriveInvoiceStatus({ amount, paidAmount: 0, dueDate }),
  });

  await Activity.create({ type: "payment", title: `Invoice ${invoiceNumber} recorded`, description: `PKR ${amount.toLocaleString("en-US")}`, dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Recorded invoice ${invoiceNumber}`, module: "deals", resourceType: "Invoice", resourceId: invoice.id, departmentId: deal.departmentId });
  return invoice;
}

export async function updateInvoice(user, id, payload) {
  requirePermission(user, "invoices.manage");
  const { invoice, deal } = await loadInvoice(user, id);

  const invoiceNumber = payload.invoiceNumber !== undefined ? String(payload.invoiceNumber).trim() : invoice.invoiceNumber;
  if (!invoiceNumber) throw new Error("Enter the invoice number from the finance system.");
  if (invoiceNumber !== invoice.invoiceNumber) {
    const clash = await Invoice.findOne({ where: { invoiceNumber } });
    if (clash) throw new Error(`Invoice ${invoiceNumber} is already recorded.`);
  }
  const amount = payload.amount !== undefined ? money(payload.amount, "invoice amount") : Number(invoice.amount);
  if (amount < Number(invoice.paidAmount)) throw new Error("The amount cannot be less than what has already been paid.");
  const dueDate = payload.dueDate !== undefined ? dateOnly(payload.dueDate) : invoice.dueDate;
  const issueDate = payload.issueDate !== undefined ? dateOnly(payload.issueDate) : invoice.issueDate;

  await invoice.update({ invoiceNumber, amount, issueDate, dueDate, status: deriveInvoiceStatus({ amount, paidAmount: invoice.paidAmount, dueDate }) });
  await recordAudit({ userId: user.id, action: `Updated invoice ${invoiceNumber}`, module: "deals", resourceType: "Invoice", resourceId: id, departmentId: deal.departmentId });
  return invoice;
}

export async function recordPayment(user, invoiceId, payload) {
  requirePermission(user, "invoices.manage");
  const { invoice, deal } = await loadInvoice(user, invoiceId);

  const amount = money(payload.amount, "payment amount");
  const balance = Number(invoice.amount) - Number(invoice.paidAmount);
  if (amount > balance + 0.001) throw new Error(`The payment is more than the balance (PKR ${balance.toLocaleString("en-US")}).`);
  const method = PAYMENT_METHODS.includes(payload.method) ? payload.method : "Bank Transfer";
  const paidAt = payload.paidAt ? new Date(`${dateOnly(payload.paidAt)}T12:00:00`) : new Date();

  const payment = await Payment.create({ invoiceId: invoice.id, amount, method, reference: payload.reference?.trim() || null, paidAt });
  const paidAmount = Number(invoice.paidAmount) + amount;
  await invoice.update({ paidAmount, status: deriveInvoiceStatus({ amount: invoice.amount, paidAmount, dueDate: invoice.dueDate }) });

  await Activity.create({ type: "payment", title: `Payment received on ${invoice.invoiceNumber}`, description: `PKR ${amount.toLocaleString("en-US")} via ${method}`, dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId, userId: user.id, occurredAt: new Date() });
  await recordAudit({ userId: user.id, action: `Recorded payment of PKR ${amount} on ${invoice.invoiceNumber}`, module: "deals", resourceType: "Payment", resourceId: payment.id, departmentId: deal.departmentId });
  return payment;
}

/** Removes a payment entered by mistake and recalculates the invoice. */
export async function deletePayment(user, paymentId) {
  requirePermission(user, "invoices.manage");
  const payment = await Payment.findByPk(paymentId);
  if (!payment) throw new Error("Payment not found.");
  const { invoice, deal } = await loadInvoice(user, payment.invoiceId);
  const paidAmount = Math.max(0, Number(invoice.paidAmount) - Number(payment.amount));
  await payment.destroy();
  await invoice.update({ paidAmount, status: deriveInvoiceStatus({ amount: invoice.amount, paidAmount, dueDate: invoice.dueDate }) });
  await recordAudit({ userId: user.id, action: `Removed a payment from ${invoice.invoiceNumber}`, module: "deals", resourceType: "Payment", resourceId: paymentId, departmentId: deal.departmentId });
}
