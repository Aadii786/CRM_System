import { NextResponse } from "next/server";
import { recordClickByToken } from "@/lib/services/emailDeliveryService";

// Click tracking: records the click, then sends the reader on to the real link.
// The destination is inside the signed token, so this cannot be abused as an open redirect.
export async function GET(request, { params }) {
  const { token } = await params;
  const url = await recordClickByToken(token).catch(() => null);
  if (!url) return NextResponse.redirect(new URL("/", request.url), 302);
  return NextResponse.redirect(url, 302);
}
