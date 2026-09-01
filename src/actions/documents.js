"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as documentService from "@/lib/services/documentService";

export async function uploadDocumentAction(_prevState, formData) {
  const user = await requireUser();
  const relatedType = formData.get("relatedType");
  const relatedId = Number(formData.get("relatedId"));
  const description = formData.get("description")?.toString().trim();
  const file = formData.get("file");
  const revalidateTarget = formData.get("revalidatePath")?.toString();

  try {
    await documentService.uploadDocument(user, { relatedType, relatedId, file, description });
    if (revalidateTarget) revalidatePath(revalidateTarget);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not upload document." };
  }
}

export async function listDocumentsAction(relatedType, relatedId) {
  const user = await requireUser();
  const docs = await documentService.listDocuments(user, relatedType, relatedId);
  return docs.map((d) => d.get({ plain: true }));
}

export async function deleteDocumentAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const revalidateTarget = formData.get("revalidatePath")?.toString();
  await documentService.deleteDocument(user, id);
  if (revalidateTarget) revalidatePath(revalidateTarget);
}
