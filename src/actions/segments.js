"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as segmentService from "@/lib/services/segmentService";

export async function previewSegmentCountAction(departmentKey, conditions) {
  const user = await requireUser();
  return segmentService.previewSegmentCount(user, departmentKey, conditions);
}

export async function createSegmentAction(_prevState, formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim();
  const conditionsRaw = formData.get("conditions")?.toString() || "[]";
  if (!name) return { error: "Segment name is required." };

  let conditions = [];
  try {
    conditions = JSON.parse(conditionsRaw);
  } catch {
    conditions = [];
  }

  try {
    const segment = await segmentService.createSegment(user, {
      name,
      description,
      departmentKey: user.department?.key,
      conditions,
    });
    revalidatePath("/segments");
    return { success: true, id: segment.id };
  } catch (err) {
    return { error: err.message || "Could not create segment." };
  }
}

export async function deleteSegmentAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  await segmentService.deleteSegment(user, id);
  revalidatePath("/segments");
}
