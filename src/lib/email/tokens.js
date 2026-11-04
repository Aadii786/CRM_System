import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, self-contained tokens for the links inside a campaign email
// (open pixel, tracked click, unsubscribe). The token carries everything the
// public endpoint needs (campaign, contact, destination), so nothing can be
// tampered with and no lookup table is needed.

function secret() {
  const s = process.env.EMAIL_LINK_SECRET || process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET (or EMAIL_LINK_SECRET) must be set to sign email links.");
  return s;
}

const b64 = (buf) => Buffer.from(buf).toString("base64url");

export function signToken(payload) {
  const body = b64(JSON.stringify(payload));
  const sig = b64(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

/** Returns the payload, or null when the token is malformed or the signature is wrong. */
export function verifyToken(token) {
  if (typeof token !== "string" || token.length > 4000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  let given;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
