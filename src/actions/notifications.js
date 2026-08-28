"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { markAllRead } from "@/lib/services/notificationService";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}
