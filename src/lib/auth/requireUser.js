import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./authService";
import { hasPermission } from "@/lib/permissions/rbac";

/** Redirects to /login if there's no active session; otherwise returns the user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects to /login (no session) or /403 (session but missing permission). */
export async function requireUserWithPermission(permissionKey) {
  const user = await requireUser();
  if (!hasPermission(user, permissionKey)) redirect("/403");
  return user;
}
