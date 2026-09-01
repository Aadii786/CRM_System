"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as campaignService from "@/lib/services/campaignService";

export async function createCampaignAction(_prevState, formData) {
  const user = await requireUser();
  let bodyDesign = [];
  try {
    bodyDesign = JSON.parse(formData.get("bodyDesign")?.toString() || "[]");
  } catch {
    bodyDesign = [];
  }
  const payload = {
    name: formData.get("name")?.toString().trim(),
    subject: formData.get("subject")?.toString().trim(),
    senderName: formData.get("senderName")?.toString().trim(),
    senderEmail: formData.get("senderEmail")?.toString().trim(),
    replyTo: formData.get("replyTo")?.toString().trim(),
    bodyDesign,
    segmentId: formData.get("segmentId") || null,
    schedule: formData.get("schedule")?.toString() || null,
  };
  if (!payload.name || !payload.subject) return { error: "Campaign name and subject are required." };

  try {
    const campaign = await campaignService.createCampaign(user, payload);
    revalidatePath("/campaigns");
    return { success: true, id: campaign.id };
  } catch (err) {
    return { error: err.message || "Could not create campaign." };
  }
}

export async function sendCampaignAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  await campaignService.simulateSendCampaign(user, id);
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}

export async function updateCampaignStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  await campaignService.updateCampaignStatus(user, id, status);
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
}
