"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as companyService from "@/lib/services/companyService";

function toPayload(formData) {
  return {
    name: formData.get("name")?.toString().trim(),
    organizationType: formData.get("organizationType")?.toString(),
    industry: formData.get("industry")?.toString().trim() || null,
    companySize: formData.get("companySize")?.toString() || null,
    website: formData.get("website")?.toString().trim() || null,
    phone: formData.get("phone")?.toString().trim() || null,
    email: formData.get("email")?.toString().trim() || null,
    address: formData.get("address")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    country: formData.get("country")?.toString().trim() || "Pakistan",
    leadSource: formData.get("leadSource")?.toString(),
    status: formData.get("status")?.toString(),
  };
}

export async function createCompanyAction(_prevState, formData) {
  const user = await requireUser();
  const payload = toPayload(formData);
  if (!payload.name) return { error: "Company name is required." };

  try {
    const company = await companyService.createCompany(user, payload);
    revalidatePath("/companies");
    return { success: true, id: company.id };
  } catch (err) {
    if (err instanceof companyService.DuplicateCompanyError) return { error: err.message, duplicateCompanyId: err.existingCompanyId };
    return { error: err.message || "Could not create company." };
  }
}

export async function updateCompanyAction(_prevState, formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const payload = toPayload(formData);
  try {
    await companyService.updateCompany(user, id, payload);
    revalidatePath(`/companies/${id}`);
    return { success: true };
  } catch (err) {
    if (err instanceof companyService.DuplicateCompanyError) return { error: err.message, duplicateCompanyId: err.existingCompanyId };
    return { error: err.message || "Could not update company." };
  }
}
