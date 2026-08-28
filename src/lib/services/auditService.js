import "server-only";
import db from "@/lib/db";

const { AuditLog, User } = db;

/**
 * Writes one audit log entry (requirements #27/#45). Never store passwords
 * or other secrets in `metadata`. Failures here are swallowed (logged to
 * the server console) so an audit-log write can never break the action
 * that triggered it.
 */
export async function recordAudit({
  userId,
  action,
  module,
  resourceType = null,
  resourceId = null,
  departmentId = null,
  metadata = null,
  result = "success",
}) {
  try {
    await AuditLog.create({
      userId,
      action,
      module,
      resourceType,
      resourceId: resourceId != null ? String(resourceId) : null,
      departmentId,
      metadata,
      result,
      ipAddress: null, // no reliable client IP in this demo's server-action context
      userAgent: null,
    });
  } catch (err) {
    console.error("[auditService] failed to record audit log:", err);
  }
}

export async function listAuditLogs({ page = 1, limit = 25, module = null, userId = null } = {}) {
  const where = {};
  if (module) where.module = module;
  if (userId) where.userId = userId;

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, attributes: ["id", "name", "email"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });

  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}
