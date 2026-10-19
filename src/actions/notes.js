"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as noteService from "@/lib/services/noteService";

const PATHS = { contact: "contacts", company: "companies", deal: "deals" };

export async function addNoteAction(_prevState, formData) {
  const user = await requireUser();
  const relatedType = formData.get("relatedType")?.toString();
  const relatedId = formData.get("relatedId")?.toString();
  try {
    await noteService.addNote(user, { relatedType, relatedId, body: formData.get("body")?.toString() });
    if (PATHS[relatedType]) revalidatePath(`/${PATHS[relatedType]}/${relatedId}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not save the note." };
  }
}

export async function deleteNoteAction(formData) {
  const user = await requireUser();
  const relatedType = formData.get("relatedType")?.toString();
  const relatedId = formData.get("relatedId")?.toString();
  try {
    await noteService.deleteNote(user, formData.get("id"));
    if (PATHS[relatedType]) revalidatePath(`/${PATHS[relatedType]}/${relatedId}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not delete the note." };
  }
}
