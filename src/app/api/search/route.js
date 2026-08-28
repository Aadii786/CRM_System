import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { globalSearch } from "@/lib/services/searchService";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const results = await globalSearch(user, q);
  return NextResponse.json(results);
}
