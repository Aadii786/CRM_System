import "server-only";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

/**
 * Local-disk file storage (requirements: attach meeting minutes and
 * documents to a client/query record). Deliberately behind a small
 * interface - save/read/delete by an opaque `storedFileName` - so this can
 * be swapped for real object storage (Vercel Blob, S3, etc.) later without
 * touching any calling code. Files live outside `public/` and are only
 * ever served through the authenticated /api/documents/[id] route, never
 * as a direct static URL.
 *
 * IMPORTANT: local disk storage does not survive a serverless deployment
 * (e.g. Vercel) - the filesystem there is ephemeral/read-only per request.
 * This is fine for local development; swap this module for a real
 * provider before deploying anywhere serverless.
 */
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveFile(buffer, originalName) {
  await ensureUploadDir();
  const ext = path.extname(originalName || "").slice(0, 20);
  const storedFileName = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, storedFileName), buffer);
  return storedFileName;
}

export async function readFile(storedFileName) {
  return fs.readFile(path.join(UPLOAD_DIR, storedFileName));
}

export async function deleteFile(storedFileName) {
  try {
    await fs.unlink(path.join(UPLOAD_DIR, storedFileName));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
