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
  await dealService.moveDealStage(user, dealId, stageId);
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}
