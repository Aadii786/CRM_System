import { NextResponse } from "next/server";
import { reconcileOverdueTasks } from "@/lib/services/reminderService";

/**
 * Hit by a real scheduler (Vercel Cron - see vercel.json - or any external
 * cron service) for genuine 24/7 overdue-task automation, independent of
 * whether anyone is actively using the app. Protected by CRON_SECRET so it
 * can't be triggered by an arbitrary request.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const provided = authHeader?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await reconcileOverdueTasks();
  return NextResponse.json({ ok: true, ...result });
}
