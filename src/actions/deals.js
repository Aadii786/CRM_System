"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as dealService from "@/lib/services/dealService";

export async function createDealAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    name: formData.get("name")?.toString().trim(),
    stageId: formData.get("stageId"),
    companyId: formData.get("companyId") || null,
    contactId: formData.get("contactId") || null,
    value: Number(formData.get("value")) || 0,
    expectedCloseDate: formData.get("expectedCloseDate")?.toString() || null,
    source: formData.get("source")?.toString(),
    trainingType: formData.get("trainingType")?.toString() || null,
    programId: formData.get("programId") || null,
    batchId: formData.get("batchId") || null,
  };
  if (!payload.name || !payload.stageId) return { error: "Deal name and stage are required." };

  try {
    const deal = await dealService.createDeal(user, payload);
    revalidatePath("/deals");
    return { success: true, id: deal.id };
  } catch (err) {
    return { error: err.message || "Could not create deal." };
  }
}

export async function moveDealStageAction(formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  const stageId = formData.get("stageId");
  try {
    await dealService.moveDealStage(user, dealId, stageId);
    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return { success: true };
  } catch (err) {
    // Callers (drag-and-drop / the stage dropdown) apply an optimistic
    // update before this resolves - they need a real error back so they
    // can revert it, e.g. an Executive trying to move a deal out of the
    // Approval stage without deals.approve.
    return { error: err.message || "Could not move deal." };
  }
}

export async function convertContactToDealAction(_prev, formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  try {
    const deal = await dealService.convertContactToDeal(user, contactId, {
      name: formData.get("name")?.toString(),
      trainingType: formData.get("trainingType")?.toString() || null,
      value: formData.get("value")?.toString(),
      expectedCloseDate: formData.get("expectedCloseDate")?.toString() || null,
      programId: formData.get("programId") || null,
      batchId: formData.get("batchId") || null,
    });
    revalidatePath("/deals");
    revalidatePath(`/contacts/${contactId}`);
    return { success: true, id: deal.id };
  } catch (err) {
    if (err instanceof dealService.OpenDealExistsError) return { error: err.message, existingDealId: err.existingDealId };
    return { error: err.message || "Could not convert the lead." };
  }
}

export async function setDealProgramAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  try {
    await dealService.setDealProgram(user, dealId, { programId: formData.get("programId") || null, batchId: formData.get("batchId") || null });
    revalidatePath(`/deals/${dealId}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not link the program." };
  }
}
