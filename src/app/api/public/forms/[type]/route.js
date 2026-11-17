import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/services/integrationService";
import { processSubmission } from "@/lib/services/websiteFormService";
import { rateLimit } from "@/lib/utils/rateLimit";

/**
 * Website form channel (MIR-2.5). The IKL website posts each form from its SERVER (never from the
 * visitor's browser, so the key stays secret):
 *
 *   POST /api/public/forms/<enquiry|brochure|registration|feedback>
 *   Authorization: Bearer crm_live_...        (created in API & Webhooks, linked to the IKL department)
 *   Content-Type: application/json            (or application/x-www-form-urlencoded)
 *
 * See docs/website-forms.md for the fields of each form. No CORS headers on purpose.
 */
export async function POST(request, { params }) {
  const { type } = await params;
  const header = request.headers.get("authorization") || "";
  const raw = header.replace(/^Bearer\s+/i, "") || request.headers.get("x-api-key") || "";
  const apiKey = await verifyApiKey(raw);
  if (!apiKey) return NextResponse.json({ ok: false, error: "Invalid or missing API key." }, { status: 401 });

  const limit = rateLimit(`forms:${apiKey.id}`, { limit: 120, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ ok: false, error: "Too many requests. Slow down." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const length = Number(request.headers.get("content-length") || 0);
  if (length > 50_000) return NextResponse.json({ ok: false, error: "The request is too large." }, { status: 413 });

  let payload;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) payload = await request.json();
    else payload = Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ ok: false, error: "The body could not be read. Send JSON or form fields." }, { status: 400 });
  }

  const result = await processSubmission({ apiKey, formType: String(type).toLowerCase(), payload, sourcePage: request.headers.get("referer") || payload?.sourcePage });
  return NextResponse.json(result.body, { status: result.status });
}
