"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, logout as logoutService } from "@/lib/auth/authService";
import { recordAudit } from "@/lib/services/auditService";
import { DEMO_USERS } from "@/lib/constants/demoUsers";

export async function loginAction(_prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const result = await loginWithPassword(email, password);
  if (!result.ok) {
    return { error: result.error };
  }

  await recordAudit({
    userId: result.user.id,
    action: "Logged in",
    module: "auth",
    result: "success",
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await logoutService();
  redirect("/login");
}

/**
 * One-click demo sign-in (requirements #9): the client only ever sends a
 * role key, never a password. The actual credential is resolved
 * server-side from the same env vars the seeder used to create the
 * account, so no password is ever exposed to the browser.
 */
export async function demoLoginAction(formData) {
  const roleKey = formData.get("roleKey");
  const demoUser = DEMO_USERS.find((u) => u.roleKey === roleKey);
  if (!demoUser) return { error: "Unknown demo user." };

  const isDefaultAdmin = roleKey === "CENTRAL_CRM_ADMINISTRATOR";
  const email = isDefaultAdmin
    ? process.env.DEFAULT_ADMIN_EMAIL || demoUser.email
    : demoUser.email;
  const password = isDefaultAdmin
    ? process.env.DEFAULT_ADMIN_PASSWORD
    : process.env.DEMO_USER_PASSWORD;

  const result = await loginWithPassword(email, password);
  if (!result.ok) {
    return { error: `Could not sign in as ${demoUser.name}. Has the database been seeded?` };
  }

  await recordAudit({
    userId: result.user.id,
    action: "Logged in (demo user)",
    module: "auth",
    result: "success",
  });

  redirect("/dashboard");
}
