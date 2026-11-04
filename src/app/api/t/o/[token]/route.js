import { recordOpenByToken } from "@/lib/services/emailDeliveryService";

// 1x1 transparent GIF: the open-tracking pixel inside every campaign email.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_request, { params }) {
  const { token } = await params;
  // Never fail the image: mail clients would show a broken picture.
  await recordOpenByToken(token).catch(() => {});
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Content-Length": String(GIF.length) },
  });
}
