"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as meetingService from "@/lib/services/meetingService";

export async function createMeetingAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    title: formData.get("title")?.toString().trim(),
    startAt: formData.get("startAt")?.toString(),
    endAt: formData.get("endAt")?.toString() || null,
    location: formData.get("location")?.toString().trim(),
    notes: formData.get("notes")?.toString().trim(),
  };
  if (!payload.title || !payload.startAt) return { error: "Title and start time are required." };

  try {
    const meeting = await meetingService.createMeeting(user, payload);
    revalidatePath("/meetings");
    return { success: true, id: meeting.id };
  } catch (err) {
    return { error: err.message || "Could not create meeting." };
  }
}

export async function updateMeetingStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  await meetingService.updateMeetingStatus(user, id, status);
  revalidatePath("/meetings");
}
