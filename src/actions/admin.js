"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import * as userService from "@/lib/services/userService";
import * as roleService from "@/lib/services/roleService";
import * as integrationService from "@/lib/services/integrationService";
import * as settingsService from "@/lib/services/settingsService";

export async function createUserAction(_prevState, formData) {
  const user = await requireUser();
  const payload = {
    name: formData.get("name")?.toString().trim(),
    email: formData.get("email")?.toString().trim(),
    jobTitle: formData.get("jobTitle")?.toString().trim(),
    roleKey: formData.get("roleKey")?.toString(),
    departmentId: Number(formData.get("departmentId")) || null,
    password: formData.get("password")?.toString(),
  };
  if (!payload.name || !payload.email || !payload.roleKey) return { error: "Name, email and role are required." };

  try {
    await userService.createUser(user, payload);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not create user." };
  }
}

export async function toggleUserStatusAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const status = formData.get("status");
  try {
    await userService.updateUserStatus(user, id, status);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update user status." };
  }
}

export async function updateUserRoleAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  const roleKey = formData.get("roleKey");
  try {
    await userService.updateUserRole(user, id, roleKey);
    revalidatePath("/users");
    return { success: true };
  } catch (err) {
    return { error: err.message || "Could not update role." };
  }
}

export async function toggleRolePermissionAction(formData) {
  const user = await requireUser();
  const roleId = Number(formData.get("roleId"));
  const permissionId = Number(formData.get("permissionId"));
  const enabled = formData.get("enabled") === "true";
  try {
    await roleService.toggleRolePermission(user, roleId, permissionId, enabled);
    revalidatePath("/roles");
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

export async function toggleIntegrationAction(formData) {
  const user = await requireUser();
  const key = formData.get("key");
  await integrationService.toggleIntegration(user, key);
  revalidatePath("/integrations");
}

export async function createApiKeyAction(_prevState, formData) {
  const user = await requireUser();
  const name = formData.get("name")?.toString().trim();
  if (!name) return { error: "Key name is required." };
  const result = await integrationService.createApiKey(user, name);
  revalidatePath("/api-webhooks");
  return { success: true, rawKey: result.rawKeyOnceOnly, prefix: result.keyPrefix };
}

export async function revokeApiKeyAction(formData) {
  const user = await requireUser();
  const id = formData.get("id");
  await integrationService.revokeApiKey(user, id);
  revalidatePath("/api-webhooks");
}

export async function updateSettingAction(formData) {
  const user = await requireUser();
  const category = formData.get("category");
  const key = formData.get("key");
  const value = JSON.parse(formData.get("value"));
  await settingsService.updateSetting(user, category, key, value);
  revalidatePath("/settings");
}
