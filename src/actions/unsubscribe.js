"use server";

import { unsubscribeByToken } from "@/lib/services/emailDeliveryService";

// Public (no login): the signed token in the email link is the authorization.
export async function confirmUnsubscribeAction(token) {
  try {
    return await unsubscribeByToken(token);
  } catch {
    return { ok: false };
  }
}
