import "server-only";
import db from "@/lib/db";
import { requirePermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";
import { randomBytes } from "node:crypto";
import { departmentByKey } from "./departmentService";

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
  const keys = await ApiKey.findAll({ order: [["createdAt", "DESC"]] });
  const departments = await db.Department.findAll({ attributes: ["id", "name"] });
  const names = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  return keys.map((k) => Object.assign(k, { departmentName: k.departmentId ? names[k.departmentId] || null : null }));
}

function maskKey(prefix) {
  return `${prefix}${"•".repeat(28)}`;
}

export async function createApiKey(actingUser, name, departmentKey = null) {
  requirePermission(actingUser, "api.manage");
  let departmentId = null;
  if (departmentKey) {
    const dept = await departmentByKey(departmentKey);
    if (!dept) throw new Error("Pick the department this key feeds.");
    departmentId = dept.id;
  }
  // 8 random hex characters make the prefix unique enough to find the key; the rest is the secret.
  const raw = `crm_live_${randomBytes(4).toString("hex")}${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 17);
  const bcrypt = (await import("bcryptjs")).default;
  const keyHash = await bcrypt.hash(raw, 10);

  const key = await ApiKey.create({ name, keyPrefix: prefix, keyHash, status: "active", createdBy: actingUser.id, departmentId });
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

/**
 * Checks a key sent by the website ("Authorization: Bearer crm_live_..."). Returns the key record or null.
 * The raw key is never stored: the prefix finds the candidate, bcrypt confirms it.
 */
export async function verifyApiKey(raw) {
  const value = String(raw || "").trim();
  if (!/^crm_live_[0-9a-f]{56}$/.test(value)) return null;
  const candidates = await ApiKey.findAll({ where: { keyPrefix: value.slice(0, 17), status: "active" } });
  if (!candidates.length) return null;
  const bcrypt = (await import("bcryptjs")).default;
  for (const key of candidates) {
    if (await bcrypt.compare(value, key.keyHash)) {
      ApiKey.update({ lastUsedAt: new Date() }, { where: { id: key.id } }).catch(() => {});
      return key;
    }
  }
  return null;
}

export { maskKey };
