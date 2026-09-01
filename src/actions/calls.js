"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { logCall } from "@/lib/services/callService";

export async function logCallAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    contactId: formData.get("contactId") || null,
    companyId: formData.get("companyId") || null,
    dealId: formData.get("dealId") || null,
    direction: formData.get("direction")?.toString() || "outbound",
    outcome: formData.get("outcome")?.toString(),
    durationMinutes: formData.get("durationMinutes") ? Number(formData.get("durationMinutes")) : null,
    notes: formData.get("notes")?.toString().trim() || null,
  };
  const revalidateTarget = formData.get("revalidatePath")?.toString();

  try {
    await logCall(user, payload);
    if (revalidateTarget) revalidatePath(revalidateTarget);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not log call." };
  }
}
