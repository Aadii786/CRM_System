"use strict";

// The six demo users required by the requirements (#9, #14), plus the
// department each belongs to and the role each is seeded with. Passwords
// are set from DEMO_USER_PASSWORD at seed time - never hard-coded here.
const DEMO_USERS = [
  {
    key: "rector",
    name: "Dr. Amina Sheikh",
    email: "rector@university.edu.pk",
    jobTitle: "Rector",
    roleKey: "RECTOR",
    departmentKey: "university",
    avatarColor: "#7C3AED",
  },
  {
    key: "central-admin",
    name: "Bilal Farooq",
    email: "admin@university.edu.pk",
    jobTitle: "Central CRM Administrator",
    roleKey: "CENTRAL_CRM_ADMINISTRATOR",
    departmentKey: "university",
    avatarColor: "#0EA5E9",
  },
  {
    key: "marketing-manager",
    name: "Ayesha Raza",
    email: "marketing.manager@university.edu.pk",
    jobTitle: "Marketing Manager",
    roleKey: "MARKETING_MANAGER",
    departmentKey: "marketing",
    avatarColor: "#F59E0B",
  },
  {
    key: "marketing-executive",
    name: "Hamza Iqbal",
    email: "marketing.exec@university.edu.pk",
    jobTitle: "Marketing Executive",
    roleKey: "MARKETING_EXECUTIVE",
    departmentKey: "marketing",
    avatarColor: "#F97316",
  },
  {
    key: "ikl-manager",
    name: "Sana Malik",
    email: "ikl.manager@university.edu.pk",
    jobTitle: "IKL/HSM Manager",
    roleKey: "IKL_HSM_MANAGER",
    departmentKey: "ikl-hsm",
    avatarColor: "#16A34A",
  },
  {
    key: "ikl-executive",
    name: "Usman Tariq",
    email: "ikl.exec@university.edu.pk",
    jobTitle: "IKL/HSM Executive",
    roleKey: "IKL_HSM_EXECUTIVE",
    departmentKey: "ikl-hsm",
    avatarColor: "#22C55E",
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
  },
  {
    key: "department-marketing",
    name: "Nida Aslam",
    email: "department.marketing@university.edu.pk",
    jobTitle: "Marketing",
    roleKey: "DEPARTMENT_MARKETING",
    departmentKey: "admissions",
    avatarColor: "#DB2777",
  },
  {
    key: "department-sales",
    name: "Kamran Baig",
    email: "department.sales@university.edu.pk",
    jobTitle: "Sales",
    roleKey: "DEPARTMENT_SALES",
    departmentKey: "admissions",
    avatarColor: "#2563EB",
  },
];

module.exports = { DEMO_USERS };
