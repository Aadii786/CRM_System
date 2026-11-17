import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/services/integrationService";
import { publicCatalogue } from "@/lib/services/websiteFormService";
import { rateLimit } from "@/lib/utils/rateLimit";

/**
 * Program catalogue for the website (active programs with their upcoming batches), so the
 * registration form can offer real batches. Same API key as the forms. Read-only.
 */
export async function GET(request) {
  const header = request.headers.get("authorization") || "";
  const apiKey = await verifyApiKey(header.replace(/^Bearer\s+/i, "") || request.headers.get("x-api-key") || "");
  if (!apiKey) return NextResponse.json({ ok: false, error: "Invalid or missing API key." }, { status: 401 });
  if (!apiKey.departmentId) return NextResponse.json({ ok: false, error: "This API key is not linked to a department." }, { status: 403 });
  const limit = rateLimit(`catalogue:${apiKey.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  return NextResponse.json({ ok: true, programs: await publicCatalogue(apiKey.departmentId) });
}
