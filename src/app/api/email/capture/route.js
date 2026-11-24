import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { captureInboundEmail } from "@/lib/services/emailLogService";

/**
 * "Copy to CRM" for one-to-one emails (MIR-4.4). The IT department points a CRM mailbox (for example
 * crm@ikl.com.pk, put in Bcc by staff) at this address; a provider-specific adapter converts the message to:
 *   POST { "from": "...", "to": ["..."], "cc": ["..."], "subject": "...", "text": "...", "date": "ISO", "messageId": "...", "direction": "sent|received" (optional) }
 * Authorization: Bearer <EMAIL_CAPTURE_SECRET>.  ?department=ikl-hsm chooses the workspace (default ikl-hsm).
 * See docs/email-delivery.md.
 */
function authorized(request) {
  const secret = process.env.EMAIL_CAPTURE_SECRET;
  if (!secret) return null;
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const ok = authorized(request);
  if (ok === null) return NextResponse.json({ error: "EMAIL_CAPTURE_SECRET is not configured" }, { status: 503 });
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || (!body.from && !body.to)) return NextResponse.json({ error: "from or to is required" }, { status: 400 });
  try {
    const result = await captureInboundEmail({ departmentKey: new URL(request.url).searchParams.get("department") || "ikl-hsm", ...body });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not record the email." }, { status: err.status || 500 });
  }
}
