import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authService";
import { getDocumentForDownload, deleteDocument } from "@/lib/services/documentService";

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;
  try {
    const { doc, buffer } = await getDocumentForDownload(user, id);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
        "Content-Length": String(doc.fileSize || buffer.length),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not download document." }, { status: err.status || 400 });
  }
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deleteDocument(user, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not delete document." }, { status: err.status || 400 });
  }
}
