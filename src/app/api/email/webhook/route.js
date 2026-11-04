import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import db from "@/lib/db";
import { recordEmailEvent } from "@/lib/services/emailDeliveryService";

/**
 * Provider callback: the email service reports what happened to each message.
 * Normalized format (a provider-specific adapter converts to this when the
 * real service is chosen - see docs/email-delivery.md):
 *   POST { "events": [ { "type": "delivered|opened|clicked|bounced|unsubscribed",
 *                        "campaignId": 12, "contactId": 345  (or "email": "a@b.com"),
 *                        "occurredAt": "2026-11-12T09:30:00Z" } ] }
 * Authorization: Bearer <EMAIL_WEBHOOK_SECRET>
 */
function authorized(request) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) return null; // not configured
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const ok = authorized(request);
  if (ok === null) return NextResponse.json({ error: "EMAIL_WEBHOOK_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const events = Array.isArray(body?.events) ? body.events.slice(0, 500) : [];
  let recorded = 0;
  let ignored = 0;
  for (const e of events) {
    let contactId = e.contactId;
    if (!contactId && e.email && e.campaignId) {
      const c = await db.Contact.findOne({ where: { email: String(e.email).toLowerCase() }, include: [{ model: db.CampaignRecipient, where: { campaignId: e.campaignId }, attributes: [], required: true }], attributes: ["id"] });
      contactId = c?.id;
    }
    if (!contactId || !e.campaignId) { ignored += 1; continue; }
    const when = e.occurredAt ? new Date(e.occurredAt) : new Date();
    const r = await recordEmailEvent({ campaignId: e.campaignId, contactId, type: e.type, occurredAt: Number.isNaN(when.getTime()) ? new Date() : when, metadata: e.url ? { url: e.url } : null });
    if (r.recorded) recorded += 1; else ignored += 1;
  }
  return NextResponse.json({ ok: true, recorded, ignored });
}
