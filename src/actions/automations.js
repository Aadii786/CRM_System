"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as automationService from "@/lib/services/automationService";

async function run(fn, fallback) {
  try {
    return { success: true, ...(await fn()) };
  } catch (err) {
    return { error: err?.message || fallback };
  }
}

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

export async function addAutomationStepAction(_prev, formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await automationService.addAutomationStep(user, id, formData.get("kind")?.toString(), {
      days: formData.get("days"), hours: formData.get("hours"),
      subject: formData.get("subject")?.toString(), body: formData.get("body")?.toString(),
      message: formData.get("message")?.toString(), title: formData.get("title")?.toString(),
      dueInDays: formData.get("dueInDays"), status: formData.get("status")?.toString(),
      conditionKey: formData.get("conditionKey")?.toString(),
    });
    revalidatePath(`/automations/${id}`);
    return {};
  }, "Could not add the step.");
}

export async function removeLastAutomationStepAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await automationService.removeLastAutomationStep(user, id);
    revalidatePath(`/automations/${id}`);
    return {};
  }, "Could not remove the step.");
}

export async function setAutomationStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await automationService.setAutomationStatus(user, id, formData.get("status")?.toString());
    revalidatePath(`/automations/${id}`);
    revalidatePath("/automations");
    return {};
  }, "Could not change the automation.");
}

export async function setAutomationFilterAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await automationService.setAutomationTriggerFilter(user, id, {
      programId: formData.get("programId")?.toString() || "",
      formType: formData.get("formType")?.toString() || "",
    });
    revalidatePath(`/automations/${id}`);
    return {};
  }, "Could not save the filter.");
}

export async function runDueAutomationsAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    const result = await automationService.runDueAutomationsNow(user);
    revalidatePath(`/automations/${id}`);
    return result;
  }, "Could not run the automations.");
}
