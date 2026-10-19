"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as proposalService from "@/lib/services/proposalService";

function done(dealId) {
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/notifications");
  return { success: true };
}

function fail(err, fallback) {
  return { error: err?.message || fallback };
}

function payloadFrom(formData) {
  return {
    title: formData.get("title")?.toString(),
    type: formData.get("type")?.toString(),
    value: formData.get("value")?.toString(),
    notes: formData.get("notes")?.toString(),
  };
}

export async function createProposalAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await proposalService.createProposal(user, dealId, payloadFrom(formData));
    return done(dealId);
  } catch (err) {
    return fail(err, "Could not create the proposal.");
  }
}

export async function updateProposalAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await proposalService.updateProposal(user, formData.get("id"), payloadFrom(formData));
    return done(dealId);
  } catch (err) {
    return fail(err, "Could not update the proposal.");
  }
}

// One action per step of the approval flow; each takes { id, dealId } (+ reason / outcome).
export async function proposalStepAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const dealId = formData.get("dealId");
  const step = formData.get("step")?.toString();
  try {
    if (step === "submit") await proposalService.submitProposalForApproval(user, id);
    else if (step === "approve") await proposalService.approveProposal(user, id);
    else if (step === "reject") await proposalService.rejectProposal(user, id, formData.get("reason")?.toString());
    else if (step === "sent") await proposalService.markProposalSent(user, id);
    else if (step === "accepted") await proposalService.setProposalOutcome(user, id, "Accepted");
    else if (step === "declined") await proposalService.setProposalOutcome(user, id, "Rejected");
    else if (step === "delete") await proposalService.deleteProposal(user, id);
    else return { error: "Unknown step." };
    return done(dealId);
  } catch (err) {
    return fail(err, "That did not work.");
  }
}
