"use strict";

const { randomUUID } = require("crypto");
const { createRng, pick, pickWeighted, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");
const {
  PAKISTANI_FIRST_NAMES,
  PAKISTANI_LAST_NAMES,
  INTERNATIONAL_FIRST_NAMES,
  INTERNATIONAL_LAST_NAMES,
  CITIES,
  JOB_TITLES,
} = require("./lib/nameData");
const { LEAD_SOURCES } = require("../../constants/crm");

// Marketing target matches the requirements' headline "58,000 contacts".
// IKL/HSM's separate, much smaller contact base mirrors the worked example
// in requirements #41 (Department Performance: Marketing 58,000 / IKL-HSM 4,280).
const MARKETING_CONTACT_COUNT = Number(process.env.SEED_CONTACT_COUNT) || 58000;
const IKL_CONTACT_COUNT = 4280;
const CHUNK_SIZE = 2000;

function statusForScore(rng, score) {
  if (score >= 85) return pickWeighted(rng, [{ value: "Converted", weight: 30 }, { value: "Qualified", weight: 70 }]);
  if (score >= 60) return "Qualified";
  if (score >= 35) return pickWeighted(rng, [{ value: "Interested", weight: 60 }, { value: "Engaged", weight: 40 }]);
  if (score >= 15) return pickWeighted(rng, [{ value: "Engaged", weight: 50 }, { value: "New", weight: 50 }]);
  return pickWeighted(rng, [
    { value: "New", weight: 55 },
    { value: "Inactive", weight: 25 },
    { value: "Unsubscribed", weight: 12 },
    { value: "Bounced", weight: 8 },
  ]);
}

function engagementForStatus(rng, status) {
  const map = {
    Converted: ["Engaged", "Clicked"],
    Qualified: ["Clicked", "Engaged"],
    Interested: ["Clicked", "Opened"],
    Engaged: ["Opened", "Engaged"],
    New: ["Delivered", "Inactive"],
    Inactive: ["Inactive"],
    Unsubscribed: ["Unsubscribed"],
    Bounced: ["Bounced"],
  };
  return pick(rng, map[status] || ["Inactive"]);
}

function buildPerson(rng, index) {
  const isPakistani = rng() < 0.72;
  const first = pick(rng, isPakistani ? PAKISTANI_FIRST_NAMES : INTERNATIONAL_FIRST_NAMES);
  const last = pick(rng, isPakistani ? PAKISTANI_LAST_NAMES : INTERNATIONAL_LAST_NAMES);
  const loc = pick(rng, CITIES);
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${index}@${pick(rng, ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com"])}`;
  return { first, last, loc, email };
}

async function insertChunked(queryInterface, table, rows) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    await queryInterface.bulkInsert(table, rows.slice(i, i + CHUNK_SIZE), {});
  }
}

module.exports = {
  async up(queryInterface) {
    const rng = createRng(2026);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const marketingOwners = [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]];
    const iklOwners = [userIds["ikl.manager@university.edu.pk"], userIds["ikl.exec@university.edu.pk"]];

    const [companyRows] = await queryInterface.sequelize.query(
      "SELECT id, department_id FROM companies"
    );
    const iklCompanyIds = companyRows
      .filter((c) => c.department_id === departmentIds["ikl-hsm"])
      .map((c) => c.id);
    const marketingPartnerCompanyIds = companyRows
      .filter((c) => c.department_id === departmentIds["marketing"])
      .map((c) => c.id);

    // ---- Marketing contacts ----
    const marketingRows = [];
    for (let i = 0; i < MARKETING_CONTACT_COUNT; i++) {
      const { first, last, loc, email } = buildPerson(rng, i);
      const leadScore = pickWeighted(rng, [
        { value: intBetween(rng, 0, 14), weight: 40 },
        { value: intBetween(rng, 15, 34), weight: 25 },
        { value: intBetween(rng, 35, 59), weight: 18 },
        { value: intBetween(rng, 60, 84), weight: 12 },
        { value: intBetween(rng, 85, 100), weight: 5 },
      ]);
      const status = statusForScore(rng, leadScore);
      const hasCompany = marketingPartnerCompanyIds.length > 0 && rng() < 0.04;

      marketingRows.push({
        uuid: randomUUID(),
        first_name: first,
        last_name: last,
        email,
        phone: `+92-3${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}`,
        whatsapp_number: rng() < 0.6 ? `+92-3${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}` : null,
        job_title: rng() < 0.3 ? pick(rng, JOB_TITLES) : null,
        city: loc.city,
        country: loc.country,
        company_id: hasCompany ? pick(rng, marketingPartnerCompanyIds) : null,
        department_id: departmentIds["marketing"],
        owner_id: pick(rng, marketingOwners),
        source: pick(rng, LEAD_SOURCES),
        status,
        engagement_status: engagementForStatus(rng, status),
        lead_score: leadScore,
        last_activity_at: dateWithinDays(rng, 90),
        created_at: dateWithinDays(rng, 540, 1),
        updated_at: now,
      });
    }
    await insertChunked(queryInterface, "contacts", marketingRows);

    // ---- IKL/HSM contacts (linked to companies as HR/Training/Decision-maker contacts) ----
    const iklRows = [];
    for (let i = 0; i < IKL_CONTACT_COUNT; i++) {
      const { first, last, loc, email } = buildPerson(rng, MARKETING_CONTACT_COUNT + i);
      const leadScore = intBetween(rng, 0, 100);
      const status = statusForScore(rng, leadScore);

      iklRows.push({
        uuid: randomUUID(),
        first_name: first,
        last_name: last,
        email,
        phone: `+92-4${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}`,
        whatsapp_number: `+92-3${intBetween(rng, 0, 9)}-${intBetween(rng, 1000000, 9999999)}`,
        job_title: pick(rng, JOB_TITLES),
        city: loc.city,
        country: loc.country,
        company_id: iklCompanyIds.length > 0 ? pick(rng, iklCompanyIds) : null,
        department_id: departmentIds["ikl-hsm"],
        owner_id: pick(rng, iklOwners),
        source: pick(rng, LEAD_SOURCES),
        status,
        engagement_status: engagementForStatus(rng, status),
        lead_score: leadScore,
        last_activity_at: dateWithinDays(rng, 90),
        created_at: dateWithinDays(rng, 540, 1),
        updated_at: now,
      });
    }
    await insertChunked(queryInterface, "contacts", iklRows);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("contacts", null, {});
  },
};
