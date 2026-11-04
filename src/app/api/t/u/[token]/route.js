import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/services/emailDeliveryService";

// One-click unsubscribe (RFC 8058): mail clients POST here from the List-Unsubscribe header.
export async function POST(_request, { params }) {
  const { token } = await params;
  const result = await unsubscribeByToken(token).catch(() => ({ ok: false }));
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 400 });
}
