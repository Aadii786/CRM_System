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
  },
  {
    key: "marketing",
    name: "Marketing & Lead Department",
    description: "Owns contact database, campaigns, segments and lead nurturing automation.",
    isUniversityWide: false,
  },
  {
    key: "ikl-hsm",
    name: "IKL / HSM",
    description: "B2B corporate, government and institutional training CRM.",
    isUniversityWide: false,
  },
];

module.exports = { DEPARTMENTS };
