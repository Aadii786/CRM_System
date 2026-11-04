"use strict";

const { PERMISSIONS } = require("./permissions");

const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

const RECTOR_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "executive.dashboard.view",
  "contacts.view",
  "companies.view",
  "deals.view",
  "campaigns.view",
  "segments.view",
  "lists.view",
  "automations.view",
  "conversations.view",
  "tasks.view",
  "meetings.view",
  "reports.view",
  "reports.export",
  "audit_logs.view",
];

const MARKETING_MANAGER_PERMISSIONS = [
  "dashboard.view",
  "contacts.view",
  "contacts.create",
  "contacts.update",
  "contacts.delete",
  "contacts.import",
  "contacts.export",
  "campaigns.view",
  "campaigns.create",
  "campaigns.update",
  "campaigns.send",
  "campaigns.delete",
  "segments.view",
  "segments.create",
  "segments.update",
  "segments.delete",
  "lists.view",
  "lists.create",
  "lists.update",
  "lists.delete",
  "automations.view",
  "automations.create",
  "automations.update",
  "automations.execute",
  "automations.delete",
  "conversations.view",
  "conversations.reply",
  "conversations.assign",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
  "meetings.view",
  "meetings.create",
  "meetings.update",
  "meetings.delete",
  "reports.view",
  "reports.export",
];

const MARKETING_EXECUTIVE_PERMISSIONS = [
  "dashboard.view",
  "contacts.view",
  "contacts.create",
  "contacts.update",
  "contacts.import",
  "campaigns.view",
  "campaigns.create",
  "campaigns.update",
  "segments.view",
  "segments.create",
  "lists.view",
  "lists.create",
  "automations.view",
  "conversations.view",
  "conversations.reply",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "meetings.view",
  "meetings.create",
  "meetings.update",
  "reports.view",
];

const IKL_HSM_MANAGER_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "companies.view",
  "companies.create",
  "companies.update",
  "companies.delete",
  "contacts.view",
  "contacts.create",
  "contacts.update",
  "deals.view",
  "deals.create",
  "deals.update",
  "deals.delete",
  "deals.move_stage",
  "deals.approve",
  "lists.view",
  "lists.create",
  "lists.update",
  "lists.delete",
  "training.manage",
  "proposals.manage",
  "invoices.manage",
  "conversations.view",
  "conversations.reply",
  "conversations.assign",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "tasks.delete",
  "meetings.view",
  "meetings.create",
  "meetings.update",
  "meetings.delete",
  "reports.view",
  "reports.export",
];

const IKL_HSM_EXECUTIVE_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "companies.view",
  "companies.create",
  "companies.update",
  "contacts.view",
  "contacts.create",
  "contacts.update",
  "deals.view",
  "deals.create",
  "deals.update",
  "deals.move_stage",
  "lists.view",
  "lists.create",
  "training.manage",
  "proposals.manage",
  "invoices.manage",
  "conversations.view",
  "conversations.reply",
  "tasks.view",
  "tasks.create",
  "tasks.update",
  "meetings.view",
  "meetings.create",
  "meetings.update",
  "reports.view",
];

// Generic, department-agnostic role templates (unlike the six pilot roles
// above, these aren't hand-authored per department) - every department
// created through Settings > Departments after the initial pilot rollout
// gets its Department Head and Team Members assigned one of these two,
// with no code change required to onboard department #4, #5, ... #N.
// Scope is derived per-USER from their own departmentId (rbac.js), never
// from the role itself, so the same two roles work for any department.
const DEPARTMENT_HEAD_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "contacts.view", "contacts.create", "contacts.update", "contacts.delete", "contacts.import", "contacts.export",
  "companies.view", "companies.create", "companies.update", "companies.delete",
  "deals.view", "deals.create", "deals.update", "deals.delete", "deals.move_stage", "deals.approve",
  "campaigns.view", "campaigns.create", "campaigns.update", "campaigns.send", "campaigns.delete",
  "segments.view", "segments.create", "segments.update", "segments.delete",
  "lists.view", "lists.create", "lists.update", "lists.delete",
  "automations.view", "automations.create", "automations.update", "automations.execute", "automations.delete",
  "conversations.view", "conversations.reply", "conversations.assign",
  "tasks.view", "tasks.create", "tasks.update", "tasks.delete",
  "meetings.view", "meetings.create", "meetings.update", "meetings.delete",
  "reports.view", "reports.export",
  "users.view", "users.manage",
  "proposals.manage", "invoices.manage", "training.manage",
];

const TEAM_MEMBER_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "contacts.view", "contacts.create", "contacts.update",
  "companies.view", "companies.create", "companies.update",
  "deals.view", "deals.create", "deals.update", "deals.move_stage",
  "campaigns.view",
  "segments.view",
  "lists.view",
  "automations.view",
  "conversations.view", "conversations.reply",
  "tasks.view", "tasks.create", "tasks.update",
  "meetings.view", "meetings.create", "meetings.update",
  "reports.view",
];

// Marketing/Sales split for the generic (non-pilot) department template -
// operational tier only (no delete/send/approve/admin), matching the
// MARKETING_EXECUTIVE / IKL_HSM_EXECUTIVE shape but department-agnostic
// like DEPARTMENT_HEAD/TEAM_MEMBER above, so a Department Head can hand
// either one out to a new hire in any department created later. Contact
// visibility is NOT split between these two - both read/write the same
// department-scoped Contact rows as everyone else in their department
// (scoping is per-user departmentId, never per-role), so a contact
// created by one is immediately visible to the other.
const DEPARTMENT_MARKETING_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "contacts.view", "contacts.create", "contacts.update", "contacts.import", "contacts.export",
  "companies.view", "deals.view",
  "campaigns.view", "campaigns.create", "campaigns.update", "campaigns.send",
  "segments.view", "segments.create", "segments.update",
  "lists.view", "lists.create", "lists.update",
  "automations.view", "automations.create", "automations.update", "automations.execute",
  "conversations.view", "conversations.reply",
  "tasks.view", "tasks.create", "tasks.update",
  "meetings.view", "meetings.create", "meetings.update",
  "reports.view", "reports.export",
];

const DEPARTMENT_SALES_PERMISSIONS = [
  "dashboard.view",
  "programs.view",
  "contacts.view", "contacts.create", "contacts.update",
  "companies.view", "companies.create", "companies.update",
  "deals.view", "deals.create", "deals.update", "deals.move_stage",
  "proposals.manage", "invoices.manage", "training.manage",
  "lists.view", "lists.create", "lists.update",
  "segments.view", "campaigns.view", "automations.view",
  "conversations.view", "conversations.reply",
  "tasks.view", "tasks.create", "tasks.update",
  "meetings.view", "meetings.create", "meetings.update",
  "reports.view",
];

// The six roles required by the requirements document (#8-#10), plus the
// implicit "full access" administrator.
const ROLES = [
  {
    key: "CENTRAL_CRM_ADMINISTRATOR",
    name: "Central CRM Administrator",
    description: "Full platform access: users, roles, all CRM data, settings, integrations, audit logs.",
    scope: "university",
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    key: "RECTOR",
    name: "Rector",
    description: "University-wide executive visibility with read-only operational access and report drill-down.",
    scope: "university",
    permissions: RECTOR_PERMISSIONS,
  },
  {
    key: "MARKETING_MANAGER",
    name: "Marketing Manager",
    description: "Full access to Marketing contacts, campaigns, segments and automation.",
    scope: "marketing",
    permissions: MARKETING_MANAGER_PERMISSIONS,
  },
  {
    key: "MARKETING_EXECUTIVE",
    name: "Marketing Executive",
    description: "Operational Marketing access without delete/send/admin rights.",
    scope: "marketing",
    permissions: MARKETING_EXECUTIVE_PERMISSIONS,
  },
  {
    key: "IKL_HSM_MANAGER",
    name: "IKL/HSM Manager",
    description: "Full access to B2B companies, deals, training, proposals and invoices.",
    scope: "ikl_hsm",
    permissions: IKL_HSM_MANAGER_PERMISSIONS,
  },
  {
    key: "IKL_HSM_EXECUTIVE",
    name: "IKL/HSM Executive",
    description: "Operational IKL/HSM access without delete/invoice/admin rights.",
    scope: "ikl_hsm",
    permissions: IKL_HSM_EXECUTIVE_PERMISSIONS,
  },
  {
    key: "DEPARTMENT_HEAD",
    name: "Department Head",
    description: "Department-scoped administrator for any department created through Settings > Departments - manages their own department's team, leads, contacts, marketing and reports. Cannot create departments, see other departments' data, or change global settings.",
    scope: "any",
    permissions: DEPARTMENT_HEAD_PERMISSIONS,
  },
  {
    key: "TEAM_MEMBER",
    name: "Team Member",
    description: "Department-scoped operational CRM user for any department created through Settings > Departments - view/create/edit within their own department, no delete/export/admin rights.",
    scope: "any",
    permissions: TEAM_MEMBER_PERMISSIONS,
  },
  {
    key: "DEPARTMENT_MARKETING",
    name: "Marketing",
    description: "Marketing-side operational user for any department - contacts, campaigns, segments, lists, automations. Shares the same department contact database as Sales and the Department Head; nothing is duplicated per role.",
    scope: "any",
    permissions: DEPARTMENT_MARKETING_PERMISSIONS,
  },
  {
    key: "DEPARTMENT_SALES",
    name: "Sales",
    description: "Sales-side operational user for any department - companies, contacts, deals/pipeline. Shares the same department contact database as Marketing and the Department Head; nothing is duplicated per role.",
    scope: "any",
    permissions: DEPARTMENT_SALES_PERMISSIONS,
  },
];

module.exports = { ROLES, ALL_PERMISSION_KEYS };
