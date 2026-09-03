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
    landlineNumber: formData.get("landlineNumber")?.toString().trim() || null,
    externalId: formData.get("externalId")?.toString().trim() || null,
    linkedin: formData.get("linkedin")?.toString().trim() || null,
    timezone: formData.get("timezone")?.toString() || null,
    detectedLanguage: formData.get("detectedLanguage")?.toString() || null,
    doubleOptIn: formData.get("doubleOptIn")?.toString() || null,
    optIn: formData.get("optIn")?.toString() || null,
    jobTitle: formData.get("jobTitle")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    country: formData.get("country")?.toString().trim() || "Pakistan",
    companyId: formData.get("companyId")?.toString() || null,
    ownerId: formData.get("ownerId")?.toString() || null,
    contactType: formData.get("contactType")?.toString() || null,
    source: formData.get("source")?.toString() || "Other",
    status: formData.get("status")?.toString() || "New",
    departmentKey: formData.get("departmentKey")?.toString() || undefined,
    // A hidden "listsSubmitted" marker (always rendered alongside the list
    // checkboxes) distinguishes "the form has a Lists field and every box
    // is unchecked" from "no Lists field was rendered at all" - getAll()
    // alone can't tell those apart since an all-unchecked group submits no
    // listIds entries either way.
    listIds: formData.has("listsSubmitted") ? formData.getAll("listIds").map(String) : undefined,
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
    if (err instanceof contactService.DuplicateContactError) {
      return { error: err.message, duplicateContactId: err.existingContactId };
    }
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

export async function setContactListsAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  const listIds = formData.getAll("listIds").map(String);
  try {
    const { setContactLists } = await import("@/lib/services/listService");
    await setContactLists(user, contactId, listIds);
    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update lists." };
  }
}

export async function bulkUpdateContactStatusAction(formData) {
  const user = await requireUser();
  const ids = formData.getAll("ids");
  const status = formData.get("status");
  await contactService.bulkUpdateStatus(user, ids, status);
  revalidatePath("/contacts");
}
