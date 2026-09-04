"use server";

import { requireUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import { runImport, findExistingEmails } from "@/lib/services/importService";
import { departmentByKey } from "@/lib/services/departmentService";
import { requirePermission } from "@/lib/permissions/rbac";

export async function checkDuplicatesAction(departmentKey, emails) {
  const user = await requireUser();
  requirePermission(user, "contacts.import");
  const dept = await departmentByKey(departmentKey || user.department?.key);
  if (!dept) return { duplicateCount: 0 };
  const existing = await findExistingEmails(dept.id, emails.map((e) => e.toLowerCase()));
  return { duplicateCount: existing.size };
}

/** rows: array of mapped-field objects, one per CSV row (see ImportWizard's CONTACT_FIELDS for the full field list). */
export async function runImportAction({ filename, departmentKey, rows, listId }) {
  const user = await requireUser();
  const summary = await runImport(user, { filename, departmentKey, rows, listId });
  revalidatePath("/contacts");
  revalidatePath("/contacts/import");
  if (listId) revalidatePath(`/lists/${listId}`);
  return summary;
}
