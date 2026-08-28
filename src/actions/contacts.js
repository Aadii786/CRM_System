"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as contactService from "@/lib/services/contactService";
import { LEAD_SOURCES, CONTACT_STATUSES } from "@/lib/constants/crm";

function toPayload(formData) {
  return {
    firstName: formData.get("firstName")?.toString().trim(),
    lastName: formData.get("lastName")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    phone: formData.get("phone")?.toString().trim() || null,
    whatsappNumber: formData.get("whatsappNumber")?.toString().trim() || null,
    jobTitle: formData.get("jobTitle")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    country: formData.get("country")?.toString().trim() || "Pakistan",
    source: formData.get("source")?.toString() || "Other",
    status: formData.get("status")?.toString() || "New",
    departmentKey: formData.get("departmentKey")?.toString() || undefined,
  };
}

export async function createContactAction(_prevState, formData) {
  const user = await requireUser();
  const payload = toPayload(formData);

  if (!payload.firstName || !payload.lastName || !payload.email) {
    return { error: "First name, last name and email are required." };
  }
  if (!LEAD_SOURCES.includes(payload.source)) payload.source = "Other";
  if (!CONTACT_STATUSES.includes(payload.status)) payload.status = "New";

  try {
    const contact = await contactService.createContact(user, payload);
    revalidatePath("/contacts");
    return { success: true, id: contact.id };
  } catch (err) {
    return { error: err.message || "Could not create contact." };
  }
}

export async function updateContactAction(_prevState, formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const payload = toPayload(formData);

  try {
    await contactService.updateContact(user, id, payload);
    revalidatePath(`/contacts/${id}`);
    revalidatePath("/contacts");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update contact." };
  }
}

export async function updateContactStatusAction(id, status) {
  const user = await requireUser();
  await contactService.updateContact(user, id, { status });
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
}

export async function deleteContactAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  await contactService.deleteContact(user, id);
  revalidatePath("/contacts");
}

export async function bulkUpdateContactStatusAction(formData) {
  const user = await requireUser();
  const ids = formData.getAll("ids");
  const status = formData.get("status");
  await contactService.bulkUpdateStatus(user, ids, status);
  revalidatePath("/contacts");
}
