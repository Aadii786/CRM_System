"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as registrationService from "@/lib/services/registrationService";
import * as trainingService from "@/lib/services/trainingService";

const text = (formData, key) => formData.get(key)?.toString();

async function run(fn, fallback) {
  try {
    return { success: true, ...(await fn()) };
  } catch (err) {
    return { error: err?.message || fallback };
  }
}

function refresh(programId, batchId) {
  revalidatePath("/registrations");
  if (programId && batchId) revalidatePath(`/programs/${programId}/batches/${batchId}`);
  if (programId) revalidatePath(`/programs/${programId}`);
}

export async function registerParticipantAction(_prev, formData) {
  const user = await requireUser();
  const batchId = text(formData, "batchId");
  return run(async () => {
    const result = await registrationService.registerParticipant(user, batchId, {
      name: text(formData, "name"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      designation: text(formData, "designation"),
      companyId: text(formData, "companyId") || null,
      fee: text(formData, "fee"),
    });
    refresh(text(formData, "programId"), batchId);
    return { createdContact: result.createdContact };
  }, "Could not register the participant.");
}

export async function registerNominationAction(_prev, formData) {
  const user = await requireUser();
  const batchId = text(formData, "batchId");
  return run(async () => {
    const result = await registrationService.registerNomination(user, batchId, {
      companyId: text(formData, "companyId"),
      people: registrationService.parseNominationText(text(formData, "people")),
      fee: text(formData, "fee"),
    });
    refresh(text(formData, "programId"), batchId);
    return result;
  }, "Could not register the nominees.");
}

export async function updateRegistrationAction(_prev, formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.updateRegistration(user, text(formData, "id"), {
      status: text(formData, "status") || undefined,
      fee: text(formData, "fee"),
      paymentStatus: text(formData, "paymentStatus") || undefined,
      amountPaid: text(formData, "amountPaid"),
      invoiceNumber: text(formData, "invoiceNumber"),
      notes: text(formData, "notes"),
    });
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return {};
  }, "Could not update the registration.");
}

export async function cancelRegistrationAction(formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.updateRegistration(user, text(formData, "id"), { status: text(formData, "status") || "Cancelled" });
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return {};
  }, "Could not change the registration.");
}

export async function setAttendanceAction(formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.setAttendance(user, text(formData, "id"), text(formData, "attendance"));
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return {};
  }, "Could not mark attendance.");
}

export async function setAttendanceBulkAction(formData) {
  const user = await requireUser();
  return run(async () => {
    const ids = (text(formData, "ids") || "").split(",").map((v) => v.trim()).filter(Boolean);
    const result = await registrationService.setAttendanceBulk(user, text(formData, "batchId"), ids, text(formData, "attendance"));
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return result;
  }, "Could not mark attendance.");
}

export async function completeRegistrationAction(_prev, formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.completeRegistration(user, text(formData, "id"), {
      certificateIssued: formData.get("certificateIssued") === "on",
      certificateNumber: text(formData, "certificateNumber"),
      certificateDate: text(formData, "certificateDate"),
    });
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return {};
  }, "Could not complete the program.");
}

export async function reopenCompletionAction(formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.reopenCompletion(user, text(formData, "id"), text(formData, "status") || "In progress");
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return {};
  }, "Could not change the completion.");
}

export async function completeBatchAction(formData) {
  const user = await requireUser();
  return run(async () => {
    const result = await registrationService.completeBatch(user, text(formData, "batchId"));
    refresh(text(formData, "programId"), text(formData, "batchId"));
    return result;
  }, "Could not close the batch.");
}

export async function recordFeedbackAction(_prev, formData) {
  const user = await requireUser();
  return run(async () => {
    await registrationService.recordFeedback(user, text(formData, "id"), { score: text(formData, "score"), comments: text(formData, "comments") });
    refresh(text(formData, "programId"), text(formData, "batchId"));
    revalidatePath("/registrations");
    return {};
  }, "Could not save the feedback.");
}

// In-house participants (attendance on a deal's engagement)
export async function setParticipantAttendanceAction(formData) {
  const user = await requireUser();
  const dealId = text(formData, "dealId");
  return run(async () => {
    await trainingService.setParticipantAttendance(user, text(formData, "id"), text(formData, "attendance"));
    revalidatePath(`/deals/${dealId}`);
    return {};
  }, "Could not mark attendance.");
}
