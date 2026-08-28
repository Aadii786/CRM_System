"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as taskService from "@/lib/services/taskService";

export async function createTaskAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    title: formData.get("title")?.toString().trim(),
    description: formData.get("description")?.toString().trim(),
    dueDate: formData.get("dueDate")?.toString(),
    priority: formData.get("priority")?.toString(),
    contactId: formData.get("contactId") || null,
    companyId: formData.get("companyId") || null,
    dealId: formData.get("dealId") || null,
    departmentKey: formData.get("departmentKey")?.toString() || undefined,
  };
  if (!payload.title) return { error: "Task title is required." };

  try {
    const task = await taskService.createTask(user, payload);
    if (payload.contactId) revalidatePath(`/contacts/${payload.contactId}`);
    if (payload.companyId) revalidatePath(`/companies/${payload.companyId}`);
    if (payload.dealId) revalidatePath(`/deals/${payload.dealId}`);
    revalidatePath("/tasks");
    return { success: true, id: task.id };
  } catch (err) {
    return { error: err.message || "Could not create task." };
  }
}

export async function updateTaskStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  await taskService.updateTaskStatus(user, id, status);
  revalidatePath("/tasks");
}

export async function deleteTaskAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  await taskService.deleteTask(user, id);
  revalidatePath("/tasks");
}
