import "server-only";
import db from "@/lib/db";
import { requirePermission, requireDepartmentAccess, hasPermission } from "@/lib/permissions/rbac";
import { recordAudit } from "./auditService";
import { createNotification } from "./notificationService";

const { Proposal, Deal, Department, User, Activity, UserRole, Role } = db;

const PROPOSAL_TYPES = ["Initial", "Final"];

/**
 * Proposal life cycle (IKL: manager approval before anything goes out):
 *   Not submitted -> Pending -> Approved -> status Sent -> Accepted / Rejected
 *                          \-> Rejected (with a reason, can be edited and resubmitted)
 * Only a user with deals.approve (the department head) can approve or reject.
 */

async function loadDeal(user, dealId) {
  const deal = await Deal.findByPk(dealId, { include: [Department] });
  if (!deal) throw new Error("Deal not found.");
  requireDepartmentAccess(user, deal.Department?.key);
  return deal;
}

async function loadProposal(user, id) {
  const proposal = await Proposal.findByPk(id);
  if (!proposal) throw new Error("Proposal not found.");
  const deal = await loadDeal(user, proposal.dealId);
  return { proposal, deal };
}

function logActivity(user, deal, title, description) {
  return Activity.create({
    type: "proposal",
    title,
    description: description || null,
    dealId: deal.id,
    companyId: deal.companyId,
    contactId: deal.contactId,
    userId: user.id,
    occurredAt: new Date(),
  });
}

export async function listProposals(user, dealId) {
  requirePermission(user, "deals.view");
  await loadDeal(user, dealId);
  return Proposal.findAll({
    where: { dealId },
    include: [
      { model: User, as: "createdBy", attributes: ["id", "name"] },
      { model: User, as: "approvedBy", attributes: ["id", "name"] },
    ],
    order: [["createdAt", "DESC"]],
  });
}

export async function createProposal(user, dealId, payload) {
  requirePermission(user, "proposals.manage");
  const deal = await loadDeal(user, dealId);

  const title = String(payload.title || "").trim();
  if (!title) throw new Error("Give the proposal a title.");
  const value = Number(payload.value);
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid proposal value.");
  const type = PROPOSAL_TYPES.includes(payload.type) ? payload.type : "Initial";

  const proposal = await Proposal.create({
    dealId: deal.id,
    title,
    type,
    value,
    notes: payload.notes?.trim() || null,
    status: "Draft",
    approvalStatus: "Not submitted",
    createdById: user.id,
  });
  await logActivity(user, deal, `Proposal drafted: ${title}`);
  await recordAudit({ userId: user.id, action: `Created proposal "${title}"`, module: "deals", resourceType: "Proposal", resourceId: proposal.id, departmentId: deal.departmentId });
  return proposal;
}

export async function updateProposal(user, id, payload) {
  requirePermission(user, "proposals.manage");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.status !== "Draft") throw new Error("A proposal that has been sent can no longer be edited. Create a Final proposal instead.");

  const title = payload.title !== undefined ? String(payload.title).trim() : proposal.title;
  if (!title) throw new Error("Give the proposal a title.");
  const value = payload.value !== undefined ? Number(payload.value) : Number(proposal.value);
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid proposal value.");

  // Changing an already submitted / approved proposal sends it back through approval.
  const needsReapproval = proposal.approvalStatus === "Pending" || proposal.approvalStatus === "Approved" || proposal.approvalStatus === "Rejected";
  await proposal.update({
    title,
    value,
    type: PROPOSAL_TYPES.includes(payload.type) ? payload.type : proposal.type,
    notes: payload.notes !== undefined ? payload.notes?.trim() || null : proposal.notes,
    ...(needsReapproval ? { approvalStatus: "Not submitted", approvedById: null, approvedAt: null, rejectionReason: null } : {}),
  });
  await logActivity(user, deal, `Proposal updated: ${title}`, needsReapproval ? "Approval reset - submit it again." : null);
  await recordAudit({ userId: user.id, action: `Updated proposal "${title}"`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
  return proposal;
}

export async function submitProposalForApproval(user, id) {
  requirePermission(user, "proposals.manage");
  const { proposal, deal } = await loadProposal(user, id);
  if (!["Not submitted", "Rejected"].includes(proposal.approvalStatus)) throw new Error("This proposal is already submitted.");
  await proposal.update({ approvalStatus: "Pending", rejectionReason: null });
  await logActivity(user, deal, `Proposal submitted for approval: ${proposal.title}`);
  await recordAudit({ userId: user.id, action: `Submitted proposal "${proposal.title}" for approval`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });

  // Tell the people who can approve it (department heads of this department).
  try {
    const approvers = await User.findAll({
      where: { departmentId: deal.departmentId, status: "active" },
      include: [{ model: Role, through: { attributes: [] }, include: [{ model: db.Permission, through: { attributes: [] }, where: { key: "deals.approve" }, required: true }], required: true }],
    });
    await Promise.all(approvers.filter((a) => a.id !== user.id).map((a) => createNotification({
      userId: a.id,
      type: "approval",
      title: "Proposal waiting for your approval",
      body: `${proposal.title} on ${deal.name}`,
      link: `/deals/${deal.id}`,
    })));
  } catch {
    // Notifying is best-effort; the proposal is already pending either way.
  }
  return proposal;
}

export async function approveProposal(user, id) {
  requirePermission(user, "deals.approve");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.approvalStatus !== "Pending") throw new Error("Only a proposal that is waiting for approval can be approved.");
  await proposal.update({ approvalStatus: "Approved", approvedById: user.id, approvedAt: new Date(), rejectionReason: null });
  await logActivity(user, deal, `Proposal approved: ${proposal.title}`);
  await recordAudit({ userId: user.id, action: `Approved proposal "${proposal.title}"`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
  if (proposal.createdById && proposal.createdById !== user.id) {
    await createNotification({ userId: proposal.createdById, type: "approval", title: "Your proposal was approved", body: `${proposal.title} on ${deal.name}`, link: `/deals/${deal.id}` }).catch(() => {});
  }
  return proposal;
}

export async function rejectProposal(user, id, reason) {
  requirePermission(user, "deals.approve");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.approvalStatus !== "Pending") throw new Error("Only a proposal that is waiting for approval can be rejected.");
  const why = String(reason || "").trim();
  if (!why) throw new Error("Please give a reason so the author knows what to change.");
  await proposal.update({ approvalStatus: "Rejected", approvedById: user.id, approvedAt: new Date(), rejectionReason: why.slice(0, 500) });
  await logActivity(user, deal, `Proposal not approved: ${proposal.title}`, why);
  await recordAudit({ userId: user.id, action: `Rejected proposal "${proposal.title}"`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
  if (proposal.createdById && proposal.createdById !== user.id) {
    await createNotification({ userId: proposal.createdById, type: "approval", title: "Your proposal needs changes", body: `${proposal.title}: ${why}`, link: `/deals/${deal.id}` }).catch(() => {});
  }
  return proposal;
}

/** Marks an approved proposal as sent to the client. */
export async function markProposalSent(user, id) {
  requirePermission(user, "proposals.manage");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.approvalStatus !== "Approved") throw new Error("A proposal must be approved by the department head before it is sent.");
  if (proposal.status !== "Draft") throw new Error("This proposal has already been sent.");
  await proposal.update({ status: "Sent", sentDate: new Date().toISOString().slice(0, 10) });
  await logActivity(user, deal, `Proposal sent: ${proposal.title}`);
  await recordAudit({ userId: user.id, action: `Marked proposal "${proposal.title}" as sent`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
  return proposal;
}

/** The client's answer to a sent proposal. */
export async function setProposalOutcome(user, id, outcome) {
  requirePermission(user, "proposals.manage");
  if (!["Accepted", "Rejected"].includes(outcome)) throw new Error("Unknown outcome.");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.status !== "Sent") throw new Error("Only a sent proposal can be accepted or declined.");
  await proposal.update({ status: outcome });
  await logActivity(user, deal, `Proposal ${outcome === "Accepted" ? "accepted" : "declined"} by the client: ${proposal.title}`);
  await recordAudit({ userId: user.id, action: `Proposal "${proposal.title}" ${outcome.toLowerCase()}`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
  return proposal;
}

export async function deleteProposal(user, id) {
  requirePermission(user, "proposals.manage");
  const { proposal, deal } = await loadProposal(user, id);
  if (proposal.status !== "Draft") throw new Error("Only a draft proposal can be deleted.");
  if (proposal.approvalStatus === "Pending" && !hasPermission(user, "deals.approve")) throw new Error("This proposal is waiting for approval.");
  await proposal.destroy();
  await logActivity(user, deal, `Proposal deleted: ${proposal.title}`);
  await recordAudit({ userId: user.id, action: `Deleted proposal "${proposal.title}"`, module: "deals", resourceType: "Proposal", resourceId: id, departmentId: deal.departmentId });
}
