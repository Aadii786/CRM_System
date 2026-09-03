import "server-only";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { createSessionCookie, clearSessionCookie, getSessionUserId } from "./session";

const { User, Role, Permission, Department } = db;

function userInclude() {
  return [
    { model: Department },
    {
      model: Role,
      include: [{ model: Permission, attributes: ["key", "module"] }],
    },
  ];
}

function serializeUser(user) {
  const roles = user.Roles || [];
  const permissionSet = new Set();
  for (const role of roles) {
    for (const perm of role.Permissions || []) {
      permissionSet.add(perm.key);
    }
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jobTitle: user.jobTitle,
    avatarColor: user.avatarColor,
    status: user.status,
    department: user.Department
      ? { id: user.Department.id, key: user.Department.key, name: user.Department.name, isUniversityWide: user.Department.isUniversityWide, isActive: user.Department.isActive }
      : null,
    roles: roles.map((r) => ({ key: r.key, name: r.name, scope: r.scope })),
    primaryRoleKey: user.primaryRoleKey,
    permissions: Array.from(permissionSet),
  };
}

// A deactivated department (Settings > Departments) blocks its own users'
// access even if their individual account is still "active" - the
// university-wide scope (Rector/Central Administrator) can never be
// deactivated (see departmentService.setDepartmentStatus), so this only
// ever affects department-scoped users.
function isBlockedByDepartment(user) {
  return Boolean(user.Department && !user.Department.isUniversityWide && user.Department.isActive === false);
}

/**
 * Verifies email/password against the database (bcrypt-hashed) and starts
 * a session. Returns { ok: true, user } or { ok: false, error }.
 * This never trusts anything the client sends beyond email/password -
 * roles and permissions are always re-derived from the DB (requirements #12).
 */
export async function loginWithPassword(email, password) {
  const user = await User.scope("withPassword").findOne({
    where: { email: String(email || "").toLowerCase().trim() },
    include: userInclude(),
  });

  if (!user || user.status !== "active" || isBlockedByDepartment(user)) {
    return { ok: false, error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password || "", user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await user.update({ lastActiveAt: new Date() });
  await createSessionCookie(user.id);

  return { ok: true, user: serializeUser(user) };
}

export async function logout() {
  await clearSessionCookie();
}

/**
 * Loads the current session's full user record (roles, permissions,
 * department) fresh from the database on every call, so an admin revoking
 * a permission takes effect on the very next request - not just next login.
 */
export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await User.findByPk(userId, { include: userInclude() });
  if (!user || user.status !== "active" || isBlockedByDepartment(user)) return null;

  return serializeUser(user);
}
