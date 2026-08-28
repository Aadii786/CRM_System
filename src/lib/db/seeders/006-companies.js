"use strict";

const { createRng, pick, pickWeighted, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const {
  CITIES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  GOVERNMENT_ORGS,
  NGO_ORGS,
} = require("./lib/nameData");
const { LEAD_SOURCES, ORGANIZATION_TYPES } = require("../../constants/crm");

const COMPANY_COUNT = 130;

function buildCompanyName(rng, orgType) {
  if (orgType === "Government") return pick(rng, GOVERNMENT_ORGS);
  if (orgType === "NGO") return pick(rng, NGO_ORGS);
  return `${pick(rng, COMPANY_PREFIXES)} ${pick(rng, COMPANY_SUFFIXES)}`;
}

module.exports = {
  async up(queryInterface) {
    const rng = createRng(101);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const iklOwners = [userIds["ikl.manager@university.edu.pk"], userIds["ikl.exec@university.edu.pk"]];
    const marketingOwners = [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]];

    const rows = [];
    const usedNames = new Set();

    for (let i = 0; i < COMPANY_COUNT; i++) {
      const isMarketingPartner = i < 12; // small set of partner institutions for Marketing
      const orgType = isMarketingPartner
        ? "University"
        : pickWeighted(rng, [
            { value: "Corporate", weight: 55 },
            { value: "Government", weight: 15 },
            { value: "Training Organization", weight: 10 },
            { value: "NGO", weight: 10 },
            { value: "University", weight: 5 },
            { value: "Other", weight: 5 },
          ]);
      let name = buildCompanyName(rng, orgType);
      while (usedNames.has(name)) name = `${buildCompanyName(rng, orgType)} ${intBetween(rng, 2, 99)}`;
      usedNames.add(name);

      const loc = pick(rng, CITIES);
      const departmentKey = isMarketingPartner ? "marketing" : "ikl-hsm";
      const owner = isMarketingPartner ? pick(rng, marketingOwners) : pick(rng, iklOwners);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");

      rows.push({
        name,
        organization_type: orgType,
        industry: orgType === "Corporate" ? pick(rng, ["Manufacturing", "Textiles", "Banking", "Pharmaceuticals", "FMCG", "Telecom", "Retail", "Energy"]) : orgType,
        website: `https://www.${slug}.com`,
        phone: `+92-42-3${intBetween(rng, 1000000, 9999999)}`,
        email: `info@${slug}.com`,
        address: `${intBetween(rng, 1, 200)} ${pick(rng, ["Main Boulevard", "Gulberg", "Model Town", "DHA Phase", "Industrial Area", "Blue Area"])}`,
        city: loc.city,
        country: loc.country,
        lead_source: pick(rng, LEAD_SOURCES),
        department_id: departmentIds[departmentKey],
        owner_id: owner,
        status: pickWeighted(rng, [
          { value: "Active", weight: 50 },
          { value: "Prospect", weight: 35 },
          { value: "Inactive", weight: 15 },
        ]),
        revenue: 0,
        last_activity_at: dateWithinDays(rng, 60),
        created_at: dateWithinDays(rng, 400, 60),
        updated_at: now,
      });
    }

    await queryInterface.bulkInsert("companies", rows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("companies", null, {});
  },
};
