import "server-only";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";

const { Integration, Webhook, ApiKey } = db;

export async function listIntegrations(user) {
  requirePermission(user, "integrations.view");
  return Integration.findAll({ order: [["category", "ASC"], ["name", "ASC"]] });
}

/**
 * Toggles an integration's demo connection state. No real OAuth/API call
 * ever happens here (requirements #46, #106) - this only flips the status
 * shown in the UI so the platform's integration surface can be evaluated.
 */
export async function toggleIntegration(actingUser, key) {
  requirePermission(actingUser, "integrations.manage");
  const integration = await Integration.findOne({ where: { key } });
  if (!integration) throw new Error("Integration not found.");

  const nextStatus = integration.status === "connected" ? "disconnected" : "connected";
  await integration.update({ status: nextStatus });
  await recordAudit({ userId: actingUser.id, action: `${nextStatus === "connected" ? "Connected" : "Disconnected"} integration: ${integration.name} (demo)`, module: "integrations", resourceType: "Integration", resourceId: integration.id });
  return integration;
}

export async function listWebhooks(user) {
  requirePermission(user, "api.manage");
  return Webhook.findAll({ order: [["createdAt", "DESC"]] });
}

export async function listApiKeys(user) {
  requirePermission(user, "api.manage");
  return ApiKey.findAll({ order: [["createdAt", "DESC"]] });
}

function maskKey(prefix) {
  return `${prefix}${"•".repeat(28)}`;
}

export async function createApiKey(actingUser, name) {
  requirePermission(actingUser, "api.manage");
  const raw = `crm_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const prefix = raw.slice(0, 12);
  const bcrypt = (await import("bcryptjs")).default;
  const keyHash = await bcrypt.hash(raw, 10);

  const key = await ApiKey.create({ name, keyPrefix: prefix, keyHash, status: "active", createdBy: actingUser.id });
  await recordAudit({ userId: actingUser.id, action: `Created API key "${name}"`, module: "api", resourceType: "ApiKey", resourceId: key.id });

  // The full raw key is only ever returned once, at creation time - it is
  // never persisted or retrievable again (only the masked prefix is).
  return { ...key.get({ plain: true }), rawKeyOnceOnly: raw };
}

export async function revokeApiKey(actingUser, id) {
  requirePermission(actingUser, "api.manage");
  await ApiKey.update({ status: "revoked" }, { where: { id } });
  await recordAudit({ userId: actingUser.id, action: "Revoked API key", module: "api", resourceType: "ApiKey", resourceId: id });
}

export { maskKey };
