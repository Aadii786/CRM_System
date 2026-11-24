import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { importProgramData, buildTemplate } from "@/lib/services/programDataImportService";

const MAX_BYTES = 25 * 1024 * 1024;

// GET: the empty template workbook. POST (multipart: file, mode = check | import): runs the migration.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return new NextResponse(buildTemplate(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"IKL-program-data-template.xlsx\"",
    },
  });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || file.size === 0) return NextResponse.json({ error: "Choose an Excel file first." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "The file is larger than 25 MB. Split it into two files." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importProgramData(user, { buffer, filename: file.name, dryRun: form.get("mode") !== "import" });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || "The file could not be processed." }, { status: err.status || 400 });
  }
}
