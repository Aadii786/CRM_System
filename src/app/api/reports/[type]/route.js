import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { runReport, canExportReports } from "@/lib/services/reportService";
import { toXlsx, toPdf, reportFileName } from "@/lib/reports/exporters";
import { resolveRange } from "@/lib/utils/dateRange";
import { recordAudit } from "@/lib/services/auditService";

// Download a report as Excel or PDF (MIR-3.8). Same numbers as the screen: both are built from runReport().
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canExportReports(user)) return NextResponse.json({ error: "You do not have permission to export reports." }, { status: 403 });

  const { type } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const range = resolveRange(Object.fromEntries(url.searchParams));
  try {
    const report = await runReport(user, type, range);
    const body = format === "pdf" ? toPdf(report) : toXlsx(report);
    await recordAudit({ userId: user.id, action: `Exported report "${report.title}" as ${format.toUpperCase()} (${report.period})`, module: "reports", resourceType: "Report", departmentId: user.department?.id || null });
    return new NextResponse(body, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `${url.searchParams.get("inline") === "1" ? "inline" : "attachment"}; filename="${reportFileName(report, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not create the report." }, { status: err.status || 400 });
  }
}
