"use strict";

// The six demo users required by the requirements (#9, #14), plus the
// department each belongs to and the role each is seeded with. Passwords
// are set from DEMO_USER_PASSWORD at seed time - never hard-coded here.
// `description` is per-user (not just per-role) because DEPARTMENT_MARKETING/
// DEPARTMENT_SALES are now reused across three different departments below -
// a single roleKey-keyed description would read wrong for at least two of them.
const DEMO_USERS = [
  {
    key: "rector",
    name: "Dr. Amina Sheikh",
    email: "rector@university.edu.pk",
    jobTitle: "Rector",
    roleKey: "RECTOR",
    departmentKey: "university",
    visibleOnLogin: true,
    avatarColor: "#7C3AED",
    description: "University-wide executive dashboard, read-only reports",
  },
  {
    key: "central-admin",
    name: "Bilal Farooq",
    email: "admin@university.edu.pk",
    jobTitle: "Central CRM Administrator",
    roleKey: "CENTRAL_CRM_ADMINISTRATOR",
    departmentKey: "university",
    avatarColor: "#0EA5E9",
    description: "Full platform access - users, roles, all data",
  },
  {
    key: "marketing-manager",
    name: "Ayesha Raza",
    email: "marketing.manager@university.edu.pk",
    jobTitle: "Marketing Manager",
    roleKey: "MARKETING_MANAGER",
    departmentKey: "marketing",
    avatarColor: "#F59E0B",
    isHead: true,
    description: "Heads the Marketing department - contacts, campaigns, segments, automation",
  },
  {
    key: "marketing-executive",
    name: "Hamza Iqbal",
    email: "marketing.exec@university.edu.pk",
    jobTitle: "Marketing Executive",
    roleKey: "MARKETING_EXECUTIVE",
    departmentKey: "marketing",
    avatarColor: "#F97316",
    description: "Marketing department team member - operational access",
  },
  {
    key: "marketing-sales",
    name: "Omar Siddiqui",
    email: "marketing.sales@university.edu.pk",
    jobTitle: "Sales",
    roleKey: "DEPARTMENT_SALES",
    departmentKey: "marketing",
    avatarColor: "#2563EB",
    description: "Sales side of Marketing - shares the department's contacts with Ayesha and Hamza",
  },
  {
    key: "ikl-manager",
    name: "Sana Malik",
    email: "ikl.manager@university.edu.pk",
    jobTitle: "IKL/HSM Manager",
    roleKey: "IKL_HSM_MANAGER",
    departmentKey: "ikl-hsm",
    visibleOnLogin: true,
    loginRole: "Head of Department",
    avatarColor: "#16A34A",
    isHead: true,
    description: "Heads the IKL/HSM department - companies, deals, training, proposals, invoices",
    loginDescription: "Runs IKL: approves proposals, manages the team, sees all reports",
  },
  {
    key: "ikl-executive",
    name: "Usman Tariq",
    email: "ikl.exec@university.edu.pk",
    jobTitle: "IKL/HSM Executive",
    roleKey: "IKL_HSM_EXECUTIVE",
    departmentKey: "ikl-hsm",
    visibleOnLogin: true,
    loginRole: "Sales",
    avatarColor: "#22C55E",
    description: "IKL/HSM department team member - operational B2B access",
    loginDescription: "Works leads, companies, proposals, invoices and programs",
  },
  {
    key: "ikl-marketing",
    name: "Mahnoor Chaudhry",
    email: "ikl.marketing@university.edu.pk",
    jobTitle: "Marketing",
    roleKey: "DEPARTMENT_MARKETING",
    departmentKey: "ikl-hsm",
    visibleOnLogin: true,
    loginRole: "Marketing",
    avatarColor: "#DB2777",
    description: "Marketing side of IKL/HSM - shares the department's contacts with Sana and Usman",
    loginDescription: "Builds lists and segments, runs email campaigns and automations",
  },
  // Generic department template (requirements: Rector -> Super Admin ->
  // Department Head -> Marketing/Sales, for any department created after
  // the two pilots above) - a live "Admissions" department, so a viewer
  // can actually click through this hierarchy instead of only reading
  // about it. Distinct from Marketing Manager/IKL-HSM roles above, which
  // belong to their own separate, hand-built pilot departments.
  {
    key: "department-head",
    name: "Farhan Malik",
    email: "department.head@university.edu.pk",
    jobTitle: "Department Head",
    roleKey: "DEPARTMENT_HEAD",
    departmentKey: "admissions",
    avatarColor: "#0D9488",
    isHead: true,
    description: "Runs the Admissions department - team, contacts, reports",
  },
  {
    key: "department-marketing",
    name: "Nida Aslam",
    email: "department.marketing@university.edu.pk",
    jobTitle: "Marketing",
    roleKey: "DEPARTMENT_MARKETING",
    departmentKey: "admissions",
    avatarColor: "#DB2777",
    description: "Marketing side of Admissions - shares the department's contacts with Sales",
  },
  {
    key: "department-sales",
    name: "Kamran Baig",
    email: "department.sales@university.edu.pk",
    jobTitle: "Sales",
    roleKey: "DEPARTMENT_SALES",
    departmentKey: "admissions",
    avatarColor: "#2563EB",
    description: "Sales side of Admissions - shares the department's contacts with Marketing",
  },
];

/**
 * The demo users shown (and allowed) on the login screen. By default only the
 * ones flagged `visibleOnLogin`: the Rector and the IKL team, so a department
 * testing the CRM is not confused by other departments. Set
 * DEMO_LOGIN_MODE=all to bring every demo department back. The check is also
 * enforced server-side (demoLoginAction), so a hidden user cannot be signed in
 * by crafting a request.
 */
function loginDemoUsers() {
  return process.env.DEMO_LOGIN_MODE === "all" ? DEMO_USERS : DEMO_USERS.filter((u) => u.visibleOnLogin);
}

module.exports = { DEMO_USERS, loginDemoUsers };
