import "server-only";

// Centralized authorization utility (requirements #9-#11, #40). Every
// server action / route handler / data-loading Server Component must
// route its authorization decision through these functions rather than
// re-implementing permission or department-scope logic locally.

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

export function hasPermission(user, permissionKey) {
  if (!user) return false;
  return user.permissions.includes(permissionKey);
}

export function hasAnyPermission(user, permissionKeys = []) {
  return permissionKeys.some((key) => hasPermission(user, key));
}

/** Throws ForbiddenError if the current user lacks `permissionKey`. */
export function requirePermission(user, permissionKey) {
  if (!hasPermission(user, permissionKey)) {
    throw new ForbiddenError(
      `Missing required permission: ${permissionKey}`
    );
  }
  return true;
}

const DEPARTMENT_KEY_TO_SCOPE = {
  university: "university",
  marketing: "marketing",
  "ikl-hsm": "ikl_hsm",
};

/**
 * Department keys (e.g. "marketing", "ikl-hsm") the current user is
 * allowed to see operational data for. University-wide roles (Rector,
 * Central Administrator) see every department; a department-scoped role
 * only ever sees its own department's key. Services must intersect their
 * queries with this list - never trust a departmentId/department key
 * supplied by the client (requirement #11).
 */
export function getAccessibleDepartmentKeys(user, allDepartmentKeys) {
  if (!user) return [];
  const isUniversityWide = user.department?.isUniversityWide;
  if (isUniversityWide) return allDepartmentKeys;
  return user.department ? [user.department.key] : [];
}

export function requireDepartmentAccess(user, departmentKey) {
  const isUniversityWide = user?.department?.isUniversityWide;
  if (isUniversityWide) return true;
  if (user?.department?.key === departmentKey) return true;
  throw new ForbiddenError(
    "You don't have access to this department's records."
  );
}

export function getDepartmentScope(user) {
  return DEPARTMENT_KEY_TO_SCOPE[user?.department?.key] || null;
}

export function isRector(user) {
  return user?.roles?.some((r) => r.key === "RECTOR");
}

export function isCentralAdmin(user) {
  return user?.roles?.some((r) => r.key === "CENTRAL_CRM_ADMINISTRATOR");
}
