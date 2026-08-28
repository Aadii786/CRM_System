"use strict";

// Authoritative permission catalog (requirements #10 / RBAC section #9).
// Every key here becomes a row in the `permissions` table via the seeder,
// and is the only vocabulary `requirePermission()` (src/lib/permissions/rbac.js)
// understands. Add new capabilities here first.
const PERMISSIONS = [
  // Dashboard
  { key: "dashboard.view", module: "dashboard", description: "View own department dashboard" },
  { key: "executive.dashboard.view", module: "executive", description: "View university-wide executive dashboard" },

  // Contacts
  { key: "contacts.view", module: "contacts", description: "View contacts" },
  { key: "contacts.create", module: "contacts", description: "Create contacts" },
  { key: "contacts.update", module: "contacts", description: "Edit contacts" },
  { key: "contacts.delete", module: "contacts", description: "Delete contacts" },
  { key: "contacts.import", module: "contacts", description: "Import contacts via CSV" },
  { key: "contacts.export", module: "contacts", description: "Export contacts" },

  // Companies
  { key: "companies.view", module: "companies", description: "View companies" },
  { key: "companies.create", module: "companies", description: "Create companies" },
  { key: "companies.update", module: "companies", description: "Edit companies" },
  { key: "companies.delete", module: "companies", description: "Delete companies" },

  // Deals / Pipelines
  { key: "deals.view", module: "deals", description: "View deals & pipelines" },
  { key: "deals.create", module: "deals", description: "Create deals" },
  { key: "deals.update", module: "deals", description: "Edit deals" },
  { key: "deals.delete", module: "deals", description: "Delete deals" },
  { key: "deals.move_stage", module: "deals", description: "Move a deal between pipeline stages" },

  // Training / financial (IKL-HSM)
  { key: "training.manage", module: "training", description: "Manage training programs, TNA, trainers" },
  { key: "proposals.manage", module: "training", description: "Manage proposals" },
  { key: "invoices.manage", module: "training", description: "Manage invoices & payments" },

  // Campaigns
  { key: "campaigns.view", module: "campaigns", description: "View campaigns" },
  { key: "campaigns.create", module: "campaigns", description: "Create campaigns" },
  { key: "campaigns.update", module: "campaigns", description: "Edit campaigns" },
  { key: "campaigns.send", module: "campaigns", description: "Send / schedule campaigns" },
  { key: "campaigns.delete", module: "campaigns", description: "Delete campaigns" },

  // Segments
  { key: "segments.view", module: "segments", description: "View segments" },
  { key: "segments.create", module: "segments", description: "Create segments" },
  { key: "segments.update", module: "segments", description: "Edit segments" },
  { key: "segments.delete", module: "segments", description: "Delete segments" },

  // Automation
  { key: "automations.view", module: "automations", description: "View automations" },
  { key: "automations.create", module: "automations", description: "Create automations" },
  { key: "automations.update", module: "automations", description: "Edit automations" },
  { key: "automations.execute", module: "automations", description: "Activate / run automations" },
  { key: "automations.delete", module: "automations", description: "Delete automations" },

  // Conversations / WhatsApp
  { key: "conversations.view", module: "conversations", description: "View WhatsApp conversations" },
  { key: "conversations.reply", module: "conversations", description: "Reply in a conversation" },
  { key: "conversations.assign", module: "conversations", description: "Assign a conversation" },

  // Tasks / Meetings
  { key: "tasks.view", module: "tasks", description: "View tasks" },
  { key: "tasks.create", module: "tasks", description: "Create tasks" },
  { key: "tasks.update", module: "tasks", description: "Edit / complete tasks" },
  { key: "tasks.delete", module: "tasks", description: "Delete tasks" },
  { key: "meetings.view", module: "meetings", description: "View meetings" },
  { key: "meetings.create", module: "meetings", description: "Create meetings" },
  { key: "meetings.update", module: "meetings", description: "Edit meetings" },
  { key: "meetings.delete", module: "meetings", description: "Delete meetings" },

  // Reports
  { key: "reports.view", module: "reports", description: "View reports" },
  { key: "reports.export", module: "reports", description: "Export reports" },

  // Admin
  { key: "users.view", module: "admin", description: "View users" },
  { key: "users.manage", module: "admin", description: "Create / edit / disable users" },
  { key: "roles.view", module: "admin", description: "View roles" },
  { key: "roles.manage", module: "admin", description: "Create / edit roles & permission matrix" },
  { key: "departments.view", module: "admin", description: "View departments" },
  { key: "departments.manage", module: "admin", description: "Create / edit departments" },
  { key: "settings.view", module: "admin", description: "View settings" },
  { key: "settings.manage", module: "admin", description: "Edit settings" },
  { key: "integrations.view", module: "admin", description: "View integrations" },
  { key: "integrations.manage", module: "admin", description: "Connect / configure integrations" },
  { key: "api.manage", module: "admin", description: "Manage API keys & webhooks" },
  { key: "audit_logs.view", module: "admin", description: "View audit logs" },
];

// Department scopes a permission can be evaluated against.
const DEPARTMENT_SCOPES = ["university", "marketing", "ikl_hsm"];

module.exports = { PERMISSIONS, DEPARTMENT_SCOPES };
