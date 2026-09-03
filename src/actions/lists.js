"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as listService from "@/lib/services/listService";
import { getContacts } from "@/lib/services/contactService";

/** Lightweight contact search for the List detail page's "Add Contacts" picker - not a full Server Action form submit, called imperatively. */
export async function searchContactsForListAction(query) {
  const user = await requireUser();
  const { data } = await getContacts(user, { q: query, limit: 15 });
  return data.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, email: c.email }));
}

export async function createFolderAction(formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString();
  const companyId = formData.get("companyId")?.toString() || null;
  try {
    const folder = await listService.createFolder(user, { name, companyId });
    revalidatePath("/folders");
    revalidatePath("/lists");
    return { success: true, id: folder.id, name: folder.name };
  } catch (err) {
    return { error: err.message || "Could not create folder." };
  }
}

export async function renameFolderAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const name = formData.get("name")?.toString();
  try {
    await listService.renameFolder(user, id, name);
    revalidatePath("/folders");
    revalidatePath(`/folders/${id}`);
    revalidatePath("/lists");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not rename folder." };
  }
}

export async function deleteFolderAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  try {
    await listService.deleteFolder(user, id);
    revalidatePath("/folders");
    revalidatePath("/lists");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not delete folder." };
  }
}

export async function createListAction(formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  const folderId = formData.get("folderId");
  try {
    const list = await listService.createList(user, { name, description, folderId });
    revalidatePath("/lists");
    revalidatePath(`/folders/${folderId}`);
    return { success: true, id: list.id };
  } catch (err) {
    return { error: err.message || "Could not create list." };
  }
}

export async function updateListAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString();
  try {
    await listService.updateList(user, id, { name, description });
    revalidatePath("/lists");
    revalidatePath(`/lists/${id}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update list." };
  }
}

export async function moveListAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const folderId = formData.get("folderId");
  try {
    await listService.moveList(user, id, folderId);
    revalidatePath("/lists");
    revalidatePath("/folders");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not move list." };
  }
}

export async function duplicateListAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  try {
    const copy = await listService.duplicateList(user, id);
    revalidatePath("/lists");
    return { success: true, id: copy.id };
  } catch (err) {
    return { error: err.message || "Could not duplicate list." };
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

export async function addContactsToListAction(formData) {
  const user = await requireUser();
  const listId = formData.get("listId");
  const contactIds = formData.getAll("contactIds");
  try {
    const added = await listService.addContactsToList(user, listId, contactIds);
    revalidatePath(`/lists/${listId}`);
    return { success: true, added };
  } catch (err) {
    return { error: err.message || "Could not add contacts." };
  }
}

export async function removeContactFromListAction(formData) {
  const user = await requireUser();
  const listId = formData.get("listId");
  const contactId = formData.get("contactId");
  try {
    await listService.removeContactFromList(user, listId, contactId);
    revalidatePath(`/lists/${listId}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not remove contact." };
  }
}
