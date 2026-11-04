"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { previewCompanyImport, runCompanyImport } from "@/lib/services/companyImportService";

/** rows: one object per spreadsheet row, keyed by company field (see CompanyImportWizard's FIELDS). */
export async function previewCompanyImportAction({ departmentKey, rows }) {
  const user = await requireUser();
  try {
    return { success: true, ...(await previewCompanyImport(user, { departmentKey, rows })) };
  } catch (err) {
    return { error: err.message || "Could not check the file." };
  }
}

export async function runCompanyImportAction({ filename, departmentKey, rows }) {
  const user = await requireUser();
  try {
    const summary = await runCompanyImport(user, { filename, departmentKey, rows });
    revalidatePath("/companies");
    revalidatePath("/companies/import");
    return { success: true, ...summary };
  } catch (err) {
    return { error: err.message || "The import failed." };
  }
}
