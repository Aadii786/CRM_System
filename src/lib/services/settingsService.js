import "server-only";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Setting, CustomObject } = db;

export async function getSettingsByCategory(user, category) {
  requirePermission(user, "settings.view");
  return Setting.findAll({ where: { category } });
}

export async function getAllSettings(user) {
  requirePermission(user, "settings.view");
  const rows = await Setting.findAll();
  const grouped = {};
  for (const row of rows) {
    grouped[row.category] ||= {};
    grouped[row.category][row.key] = row.value;
  }
  return grouped;
}

export async function updateSetting(actingUser, category, key, value) {
  requirePermission(actingUser, "settings.manage");
  const [setting] = await Setting.findOrCreate({ where: { category, key }, defaults: { value } });
  if (setting.value !== value) await setting.update({ value });
  await recordAudit({ userId: actingUser.id, action: `Updated setting ${category}.${key}`, module: "settings" });
  return setting;
}

export async function listCustomObjects(user) {
  requirePermission(user, "settings.view");
  return CustomObject.findAll({ order: [["name", "ASC"]] });
}
