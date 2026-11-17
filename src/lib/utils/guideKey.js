import { hasPermission } from "@/lib/permissions/rbac";

/** Which guide a person sees, derived from what they can really do (never from a hard-coded role name). */
export function guideKeyFor(user) {
  if (hasPermission(user, "executive.dashboard.view") && !hasPermission(user, "contacts.create")) return "rector";
  if (hasPermission(user, "deals.approve")) return "head";
  if (hasPermission(user, "campaigns.create")) return "marketing";
  return "sales";
}
