"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as departmentService from "@/lib/services/departmentService";

export async function updateDepartmentSenderIdentityAction(formData) {
  const user = await requireUser();
  const departmentId = formData.get("departmentId");
  const payload = {
    senderName: formData.get("senderName")?.toString(),
    senderEmail: formData.get("senderEmail")?.toString(),
    replyTo: formData.get("replyTo")?.toString(),
  };

  try {
    await departmentService.updateDepartmentSenderIdentity(user, departmentId, payload);
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update sender identity." };
  }
}

export async function createDepartmentAction(formData) {
  const user = await requireUser();
  const headMode = formData.get("headMode")?.toString();
  const payload = {
    name: formData.get("name")?.toString(),
    key: formData.get("key")?.toString(),
    description: formData.get("description")?.toString(),
    headMode,
    existingHeadUserId: formData.get("existingHeadUserId") || null,
    newHead:
      headMode === "new"
        ? {
            name: formData.get("newHeadName")?.toString(),
            email: formData.get("newHeadEmail")?.toString(),
            password: formData.get("newHeadPassword")?.toString(),
          }
        : null,
  };

  try {
    const dept = await departmentService.createDepartment(user, payload);
    revalidatePath("/settings");
    revalidatePath("/users");
    return { success: true, id: dept.id };
  } catch (err) {
    return { error: err.message || "Could not create department." };
  }
}

export async function updateDepartmentAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  try {
    await departmentService.updateDepartment(user, id, {
      name: formData.get("name")?.toString(),
      description: formData.get("description")?.toString(),
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update department." };
  }
}

export async function setDepartmentHeadAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const headUserId = formData.get("headUserId");
  try {
    await departmentService.setDepartmentHead(user, id, headUserId);
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not set department head." };
  }
}

export async function setDepartmentStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const isActive = formData.get("isActive") === "true";
  try {
    await departmentService.setDepartmentStatus(user, id, isActive);
    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update department status." };
  }
}
