import { NextResponse } from "next/server";
import { runDueAutomations } from "@/lib/services/automationEngine";

/** Scheduler for automations: wakes everyone whose wait is over. Protected by CRON_SECRET. */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    const provided = header?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runDueAutomations();
  return NextResponse.json({ ok: true, ...result });
}
