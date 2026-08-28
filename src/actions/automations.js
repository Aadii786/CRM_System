"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as automationService from "@/lib/services/automationService";

export async function createAutomationAction(_prevState, formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const triggerType = formData.get("triggerType")?.toString();
  if (!name || !triggerType) return { error: "Name and trigger are required." };

  try {
    const automation = await automationService.createAutomation(user, { name, description, triggerType, departmentKey: user.department?.key });
    revalidatePath("/automations");
    return { success: true, id: automation.id };
  } catch (err) {
    return { error: err.message || "Could not create automation." };
  }
}

export async function runDemoAutomationAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const result = await automationService.runDemoAutomation(user, id);
  revalidatePath(`/automations/${id}`);
  return result;
}

export async function updateAutomationStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  await automationService.updateAutomationStatus(user, id, status);
  revalidatePath(`/automations/${id}`);
  revalidatePath("/automations");
}
