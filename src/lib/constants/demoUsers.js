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
];

module.exports = { DEMO_USERS };
