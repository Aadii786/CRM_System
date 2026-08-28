import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { hasPermission } from "@/lib/permissions/rbac";
import { getContacts } from "@/lib/services/contactService";
import { recordAudit } from "@/lib/services/auditService";

const EXPORT_CAP = 5000; // demo cap - keeps the export fast; a real deployment would stream all rows.

function toCsvValue(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!hasPermission(user, "contacts.export")) {
    return NextResponse.json({ error: "Missing contacts.export permission" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const { data } = await getContacts(user, {
    page: 1,
    limit: EXPORT_CAP,
    q: searchParams.get("q") || "",
    status: searchParams.get("status") || undefined,
    source: searchParams.get("source") || undefined,
    engagementStatus: searchParams.get("engagement") || undefined,
  });

  const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Engagement", "Source", "Lead Score", "Company", "Created At"];
  const rows = data.map((c) => [
    c.firstName, c.lastName, c.email, c.phone || "", c.status, c.engagementStatus, c.source, c.leadScore,
    c.Company?.name || "", c.createdAt?.toISOString?.() || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(toCsvValue).join(",")).join("\n");

  await recordAudit({ userId: user.id, action: `Exported ${data.length} contacts`, module: "contacts" });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-export.csv"`,
    },
  });
}
