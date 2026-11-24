"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { logEmail } from "@/lib/services/emailLogService";

export async function logEmailAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    contactId: formData.get("contactId") || null,
    companyId: formData.get("companyId") || null,
    dealId: formData.get("dealId") || null,
    direction: formData.get("direction")?.toString() || "sent",
    subject: formData.get("subject")?.toString().trim(),
    body: formData.get("body")?.toString().trim() || null,
    occurredAt: formData.get("occurredAt")?.toString() || null,
  };
  const revalidateTarget = formData.get("revalidatePath")?.toString();
  try {
    await logEmail(user, payload);
    if (revalidateTarget) revalidatePath(revalidateTarget);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not log the email." };
  }
}
