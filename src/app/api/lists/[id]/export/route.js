import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { getList, getListMembers } from "@/lib/services/listService";
import { recordAudit } from "@/lib/services/auditService";

const EXPORT_CAP = 5000; // demo cap, matches /api/contacts/export

function toCsvValue(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { id } = await params;

  const list = await getList(user, id);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const { data } = await getListMembers(user, id, { page: 1, limit: EXPORT_CAP });

  const headers = ["First Name", "Last Name", "Email", "Phone", "Job Title", "Company"];
  const rows = data.map((c) => [c.firstName, c.lastName, c.email, c.phone || "", c.jobTitle || "", c.companyId || ""]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

  await recordAudit({ userId: user.id, action: `Exported ${data.length} contacts from list "${list.name}"`, module: "lists" });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${list.name.replace(/[^a-z0-9]+/gi, "-")}-contacts.csv"`,
    },
  });
}
