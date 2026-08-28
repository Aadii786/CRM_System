import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Stateless, httpOnly-cookie session (requirements #12: no localStorage
// role/admin flags, no frontend-only auth). The cookie only carries the
// user id + a short display cache; every permission check re-reads the
// authoritative roles/permissions from the database (see
// src/lib/permissions/rbac.js) so a permission change takes effect
// immediately without waiting for token expiry.
const COOKIE_NAME = "crm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random value in .env.local."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Returns the authenticated user id from the session cookie, or null. */
export async function getSessionUserId() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.uid ?? null;
  } catch {
    return null;
  }
}
