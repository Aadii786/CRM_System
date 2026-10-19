"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as financeService from "@/lib/services/financeService";

function done(dealId) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/reports/revenue");
  return { success: true };
}

export async function createInvoiceAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await financeService.createInvoice(user, dealId, {
      invoiceNumber: formData.get("invoiceNumber")?.toString(),
      amount: formData.get("amount")?.toString(),
      issueDate: formData.get("issueDate")?.toString(),
      dueDate: formData.get("dueDate")?.toString(),
      proposalId: formData.get("proposalId")?.toString(),
    });
    return done(dealId);
  } catch (err) {
    return { error: err.message || "Could not record the invoice." };
  }
}

export async function recordPaymentAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await financeService.recordPayment(user, formData.get("invoiceId"), {
      amount: formData.get("amount")?.toString(),
      method: formData.get("method")?.toString(),
      reference: formData.get("reference")?.toString(),
      paidAt: formData.get("paidAt")?.toString(),
    });
    return done(dealId);
  } catch (err) {
    return { error: err.message || "Could not record the payment." };
  }
}

export async function deletePaymentAction(formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await financeService.deletePayment(user, formData.get("id"));
    return done(dealId);
  } catch (err) {
    return { error: err.message || "Could not remove the payment." };
  }
}
