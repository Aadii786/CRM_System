"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as listService from "@/lib/services/listService";

export async function createFolderAction(formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString();
  try {
    const folder = await listService.createFolder(user, name);
    revalidatePath("/lists");
    return { success: true, id: folder.id, name: folder.name };
  } catch (err) {
    return { error: err.message || "Could not create folder." };
  }
}

export async function createListAction(formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString();
  const folderId = formData.get("folderId");
  try {
    const list = await listService.createList(user, { name, folderId });
    revalidatePath("/lists");
    return { success: true, id: list.id };
  } catch (err) {
    return { error: err.message || "Could not create list." };
  }
}

export async function deleteListAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  try {
    await listService.deleteList(user, id);
    revalidatePath("/lists");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not delete list." };
  }
}
