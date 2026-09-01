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
