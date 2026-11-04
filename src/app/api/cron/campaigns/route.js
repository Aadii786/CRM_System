import { NextResponse } from "next/server";
import { runDueCampaigns } from "@/lib/services/emailDeliveryService";

/**
 * Scheduler for campaigns: starts every campaign whose scheduled time has
 * come and keeps sending unfinished ones. Hit every few minutes by Vercel Cron
 * (vercel.json) or any external cron service. Protected by CRON_SECRET.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    const provided = header?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueCampaigns();
  return NextResponse.json({ ok: true, ...result });
}
