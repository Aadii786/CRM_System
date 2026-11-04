import { NextResponse } from "next/server";
import db from "@/lib/db";

// Health check for uptime monitoring and the "is the CRM reachable" test (GO-1).
// Public on purpose; it reveals nothing beyond up/down.
export async function GET() {
  try {
    await db.sequelize.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "up", time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
