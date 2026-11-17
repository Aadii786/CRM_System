import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { handleInboundMessage, handleStatusUpdate } from "@/lib/services/whatsappService";

/**
 * WhatsApp callback: the WhatsApp service (provided by the IT department) reports replies and
 * delivery receipts. Normalized format (an adapter converts the provider's own payload to this):
 *
 *   POST { "messages": [ { "from": "923001234567", "text": "Yes please", "id": "wamid...", "timestamp": "2026-11-12T09:30:00Z" } ],
 *          "statuses": [ { "id": "wamid...", "status": "delivered|read|failed" } ] }
 *   Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>
 */
function authorized(request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return null;
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const ok = authorized(request);
  if (ok === null) return NextResponse.json({ error: "WHATSAPP_WEBHOOK_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = Array.isArray(body?.messages) ? body.messages.slice(0, 200) : [];
  const statuses = Array.isArray(body?.statuses) ? body.statuses.slice(0, 500) : [];
  let recorded = 0;
  let ignored = 0;
  for (const m of messages) {
    const when = m.timestamp ? new Date(m.timestamp) : new Date();
    const r = await handleInboundMessage({ from: m.from, text: m.text, providerMessageId: m.id || null, occurredAt: Number.isNaN(when.getTime()) ? new Date() : when });
    if (r.recorded) recorded += 1; else ignored += 1;
  }
  for (const s of statuses) {
    const r = await handleStatusUpdate({ providerMessageId: s.id, status: s.status });
    if (r.recorded) recorded += 1; else ignored += 1;
  }
  return NextResponse.json({ ok: true, recorded, ignored });
}
