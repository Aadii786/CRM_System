"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as programService from "@/lib/services/programService";
import * as trainingService from "@/lib/services/trainingService";

const text = (formData, key) => formData.get(key)?.toString();

function programPayload(formData) {
  return {
    title: text(formData, "title"),
    code: text(formData, "code"),
    category: text(formData, "category") || null,
    programType: text(formData, "programType"),
    durationDays: text(formData, "durationDays"),
    durationText: text(formData, "durationText"),
    defaultFee: text(formData, "defaultFee"),
    description: text(formData, "description"),
  };
}

function batchPayload(formData) {
  return {
    code: text(formData, "code"),
    startDate: text(formData, "startDate"),
    endDate: text(formData, "endDate"),
    venue: text(formData, "venue"),
    trainerId: text(formData, "trainerId"),
    capacity: text(formData, "capacity"),
    fee: text(formData, "fee"),
    status: text(formData, "status") || undefined,
    notes: text(formData, "notes"),
  };
}

async function run(fn, fallback) {
  try {
    return { success: true, ...(await fn()) };
  } catch (err) {
    return { error: err?.message || fallback };
  }
}

export async function createProgramAction(_prev, formData) {
  const user = await requireUser();
  return run(async () => {
    const program = await programService.createProgram(user, programPayload(formData));
    revalidatePath("/programs");
    return { id: program.id };
  }, "Could not create the program.");
}

export async function updateProgramAction(_prev, formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await programService.updateProgram(user, id, programPayload(formData));
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    return {};
  }, "Could not update the program.");
}

export async function setProgramStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  return run(async () => {
    await programService.setProgramStatus(user, id, formData.get("status")?.toString());
    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    return {};
  }, "Could not change the program.");
}

export async function createBatchAction(_prev, formData) {
  const user = await requireUser();
  const programId = formData.get("programId");
  return run(async () => {
    await programService.createBatch(user, programId, batchPayload(formData));
    revalidatePath(`/programs/${programId}`);
    return {};
  }, "Could not add the batch.");
}

export async function updateBatchAction(_prev, formData) {
  const user = await requireUser();
  const programId = formData.get("programId");
  return run(async () => {
    await programService.updateBatch(user, formData.get("id"), batchPayload(formData));
    revalidatePath(`/programs/${programId}`);
    return {};
  }, "Could not update the batch.");
}

export async function deleteBatchAction(formData) {
  const user = await requireUser();
  const programId = formData.get("programId");
  return run(async () => {
    await programService.deleteBatch(user, formData.get("id"));
    revalidatePath(`/programs/${programId}`);
    return {};
  }, "Could not delete the batch.");
}

// ------- person record: interests and extra organizations

export async function addInterestAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  return run(async () => {
    await programService.addContactInterest(user, contactId, {
      programId: text(formData, "programId") || null,
      category: text(formData, "category") || null,
    });
    revalidatePath(`/contacts/${contactId}`);
    return {};
  }, "Could not add the interest.");
}

export async function removeInterestAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  return run(async () => {
    await programService.removeContactInterest(user, formData.get("id"));
    revalidatePath(`/contacts/${contactId}`);
    return {};
  }, "Could not remove the interest.");
}

export async function addOrganizationAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  return run(async () => {
    await programService.addContactOrganization(user, contactId, { companyId: text(formData, "companyId"), jobTitle: text(formData, "jobTitle") });
    revalidatePath(`/contacts/${contactId}`);
    return {};
  }, "Could not link the organization.");
}

export async function removeOrganizationAction(formData) {
  const user = await requireUser();
  const contactId = formData.get("contactId");
  return run(async () => {
    await programService.removeContactOrganization(user, formData.get("id"));
    revalidatePath(`/contacts/${contactId}`);
    return {};
  }, "Could not remove the link.");
}

// ------- in-house engagements and their participants (on a deal)

function engagementPayload(formData) {
  return {
    title: text(formData, "title"),
    trainingType: text(formData, "trainingType"),
    trainerId: text(formData, "trainerId"),
    startDate: text(formData, "startDate"),
    endDate: text(formData, "endDate"),
    location: text(formData, "location"),
    status: text(formData, "status") || undefined,
    cost: text(formData, "cost"),
  };
}

export async function createEngagementAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  return run(async () => {
    await trainingService.createEngagement(user, dealId, engagementPayload(formData));
    revalidatePath(`/deals/${dealId}`);
    return {};
  }, "Could not add the engagement.");
}

export async function updateEngagementAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  return run(async () => {
    await trainingService.updateEngagement(user, formData.get("id"), engagementPayload(formData));
    revalidatePath(`/deals/${dealId}`);
    return {};
  }, "Could not update the engagement.");
}

export async function deleteEngagementAction(formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  return run(async () => {
    await trainingService.deleteEngagement(user, formData.get("id"));
    revalidatePath(`/deals/${dealId}`);
    return {};
  }, "Could not delete the engagement.");
}

export async function addParticipantAction(_prev, formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  return run(async () => {
    const result = await trainingService.addParticipant(user, formData.get("engagementId"), {
      name: text(formData, "name"),
      email: text(formData, "email"),
      designation: text(formData, "designation"),
      phone: text(formData, "phone"),
      organization: text(formData, "organization"),
    });
    revalidatePath(`/deals/${dealId}`);
    return { createdContact: result.createdContact };
  }, "Could not add the participant.");
}

export async function removeParticipantAction(formData) {
  const user = await requireUser();
  const dealId = formData.get("dealId");
  return run(async () => {
    await trainingService.removeParticipant(user, formData.get("id"));
    revalidatePath(`/deals/${dealId}`);
    return {};
  }, "Could not remove the participant.");
}
