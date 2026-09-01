"use strict";

// Data-driven department catalog (requirements #67-#68). Adding a new
// department for future university-wide rollout means adding a row here
// (and seeding it) - no frontend rewrite required.
const DEPARTMENTS = [
  {
    key: "university",
    name: "University (Executive)",
    description: "University-wide executive scope used by the Rector and Central Administrator.",
    isUniversityWide: true,
    senderName: "University Rector's Office",
    senderEmail: "rectors.office@university.edu.pk",
    replyTo: "rectors.office@university.edu.pk",
  },
  {
    key: "marketing",
    name: "Marketing & Lead Department",
    description: "Owns contact database, campaigns, segments and lead nurturing automation.",
    isUniversityWide: false,
    senderName: "University Admissions Office",
    senderEmail: "admissions@university.edu.pk",
    replyTo: "admissions@university.edu.pk",
  },
  {
    key: "ikl-hsm",
    name: "IKL / HSM",
    description: "B2B corporate, government and institutional training CRM.",
    isUniversityWide: false,
    senderName: "IKL/HSM Corporate Training",
    senderEmail: "ikl.hsm@university.edu.pk",
    replyTo: "ikl.hsm@university.edu.pk",
  },
];

// Reference-number prefix per department (requirements: unique lead/query
// number per query, e.g. "IKL-2026-0001"). Used both when seeding demo
// deals and when a real deal is created through the app - kept as a plain
// data map here so both CommonJS (seeders) and ESM (app) code share the
// exact same source of truth.
const REFERENCE_PREFIX = {
  "ikl-hsm": "IKL",
  marketing: "MKT",
  university: "UNI",
};

function referencePrefixFor(departmentKey) {
  return REFERENCE_PREFIX[departmentKey] || departmentKey.slice(0, 3).toUpperCase();
}

/** e.g. formatReferenceNumber("IKL", 2026, 42) -> "IKL-2026-0042" */
function formatReferenceNumber(prefix, year, sequence) {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

module.exports = { DEPARTMENTS, REFERENCE_PREFIX, referencePrefixFor, formatReferenceNumber };
