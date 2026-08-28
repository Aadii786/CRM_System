"use strict";

const { createRng, pick, intBetween, dateWithinDays } = require("./lib/random");
const { idMapByColumn } = require("./lib/lookup");

// The exact ten example segments from requirements #19.
const SEGMENT_DEFS = [
  { name: "All Contacts", description: "Every contact in the Marketing database.", conditions: [] },
  { name: "Engaged Contacts", description: "Opened or clicked at least one campaign.", conditions: [{ field: "engagementStatus", operator: "in", value: "Opened,Clicked,Engaged" }] },
  { name: "Inactive Contacts", description: "No activity in the last 60 days.", conditions: [{ field: "engagementStatus", operator: "equals", value: "Inactive" }] },
  { name: "Qualified Leads", description: "Lead score at or above the qualification threshold.", conditions: [{ field: "leadScore", operator: "gte", value: "70" }] },
  { name: "Website Visitors", description: "Contacts sourced from the university website.", conditions: [{ field: "source", operator: "equals", value: "Website" }] },
  { name: "Email Clickers", description: "Clicked a campaign link.", conditions: [{ field: "engagementStatus", operator: "equals", value: "Clicked" }] },
  { name: "WhatsApp Responders", description: "Replied to a WhatsApp message.", conditions: [{ field: "whatsappNumber", operator: "is_not_null", value: "" }] },
  { name: "High Lead Score", description: "Lead score of 85 or higher.", conditions: [{ field: "leadScore", operator: "gte", value: "85" }] },
  { name: "Marketing Leads", description: "All contacts owned by the Marketing department.", conditions: [{ field: "departmentId", operator: "equals", value: "marketing" }] },
  { name: "Converted Contacts", description: "Contacts that converted into an enrolled/qualified outcome.", conditions: [{ field: "status", operator: "equals", value: "Converted" }] },
];

async function countContacts(queryInterface, where) {
  const [rows] = await queryInterface.sequelize.query(`SELECT COUNT(*) as c FROM contacts WHERE ${where}`);
  return Number(rows[0].c);
}

module.exports = {
  async up(queryInterface) {
    const rng = createRng(909);
    const now = new Date();

    const departmentIds = await idMapByColumn(queryInterface, "departments", "key");
    const userIds = await idMapByColumn(queryInterface, "users", "email");
    const marketingOwners = [userIds["marketing.manager@university.edu.pk"], userIds["marketing.exec@university.edu.pk"]];
    const marketingDeptId = departmentIds["marketing"];

    const totalMarketing = await countContacts(queryInterface, `department_id = ${marketingDeptId}`);
    const engaged = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND engagement_status IN ('Opened','Clicked','Engaged')`);
    const inactive = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND engagement_status = 'Inactive'`);
    const qualified = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND lead_score >= 70`);
    const website = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND source = 'Website'`);
    const clickers = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND engagement_status = 'Clicked'`);
    const whatsapp = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND whatsapp_number IS NOT NULL`);
    const highScore = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND lead_score >= 85`);
    const converted = await countContacts(queryInterface, `department_id = ${marketingDeptId} AND status = 'Converted'`);

    const counts = {
      "All Contacts": totalMarketing,
      "Engaged Contacts": engaged,
      "Inactive Contacts": inactive,
      "Qualified Leads": qualified,
      "Website Visitors": website,
      "Email Clickers": clickers,
      "WhatsApp Responders": whatsapp,
      "High Lead Score": highScore,
      "Marketing Leads": totalMarketing,
      "Converted Contacts": converted,
    };

    await queryInterface.bulkInsert(
      "segments",
      SEGMENT_DEFS.map((s) => ({
        name: s.name,
        description: s.description,
        type: s.conditions.length ? "dynamic" : "static",
        department_id: marketingDeptId,
        created_by: pick(rng, marketingOwners),
        contact_count: counts[s.name] || 0,
        created_at: dateWithinDays(rng, 200),
        updated_at: now,
      })),
      {}
    );

    const segmentIds = await idMapByColumn(queryInterface, "segments", "name");
    const conditionRows = [];
    for (const s of SEGMENT_DEFS) {
      s.conditions.forEach((c, idx) => {
        conditionRows.push({
          segment_id: segmentIds[s.name],
          field: c.field,
          operator: c.operator,
          value: c.value,
          group_index: idx,
          created_at: now,
          updated_at: now,
        });
      });
    }
    await queryInterface.bulkInsert("segment_conditions", conditionRows, {});

    // ---- Campaigns, incl. the mandatory 3-email nurture sequence (requirements #25) ----
    const nurtureAudience = totalMarketing;
    const CAMPAIGNS = [
      {
        name: "Fall Admissions - Email #1: Introducing Our Programs",
        subject: "Discover programs built around your career goals",
        status: "Sent",
        segment: "All Contacts",
        sentDaysAgo: 21,
        recipients: nurtureAudience,
        deliveredRate: 0.98,
        openRate: 0.55,
        clickRate: 0.14,
        bounceRate: 0.018,
        unsubRate: 0.004,
      },
      {
        name: "Fall Admissions - Email #2: Programs Designed For You",
        subject: "A closer look at what makes our programs different",
        status: "Sent",
        segment: "Engaged Contacts",
        sentDaysAgo: 14,
        recipients: engaged,
        deliveredRate: 0.98,
        openRate: 0.6,
        clickRate: 0.22,
        bounceRate: 0.01,
        unsubRate: 0.003,
      },
      {
        name: "Fall Admissions - Email #3: Applications Closing Soon",
        subject: "Last chance - applications close this Friday",
        status: "Sent",
        segment: "Email Clickers",
        sentDaysAgo: 7,
        recipients: clickers || 400,
        deliveredRate: 0.99,
        openRate: 0.68,
        clickRate: 0.31,
        bounceRate: 0.008,
        unsubRate: 0.002,
      },
      {
        name: "Alumni Newsletter - August",
        subject: "What's new at the university this month",
        status: "Sent",
        segment: "All Contacts",
        sentDaysAgo: 30,
        recipients: totalMarketing,
        deliveredRate: 0.97,
        openRate: 0.42,
        clickRate: 0.09,
        bounceRate: 0.02,
        unsubRate: 0.005,
      },
      {
        name: "Scholarship Announcement",
        subject: "New scholarships now open for applications",
        status: "Sent",
        segment: "Qualified Leads",
        sentDaysAgo: 45,
        recipients: qualified || 200,
        deliveredRate: 0.98,
        openRate: 0.61,
        clickRate: 0.25,
        bounceRate: 0.01,
        unsubRate: 0.003,
      },
      {
        name: "Winter Intake - Save the Date",
        subject: "Winter intake opens next month",
        status: "Scheduled",
        segment: "All Contacts",
        sentDaysAgo: -5,
        recipients: totalMarketing,
        deliveredRate: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0,
      },
      {
        name: "Re-engagement Campaign",
        subject: "We miss you - here's what's new",
        status: "Draft",
        segment: "Inactive Contacts",
        sentDaysAgo: null,
        recipients: inactive,
        deliveredRate: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0,
      },
      {
        name: "Open House Invitation",
        subject: "You're invited: Campus Open House",
        status: "Paused",
        segment: "Website Visitors",
        sentDaysAgo: null,
        recipients: website || 150,
        deliveredRate: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0,
      },
      {
        name: "System Test Send",
        subject: "Test - please ignore",
        status: "Failed",
        segment: "All Contacts",
        sentDaysAgo: 3,
        recipients: 25,
        deliveredRate: 0, openRate: 0, clickRate: 0, bounceRate: 0, unsubRate: 0,
      },
    ];

    const campaignRows = CAMPAIGNS.map((c) => {
      const delivered = Math.round(c.recipients * c.deliveredRate);
      const opened = Math.round(delivered * c.openRate);
      const clicked = Math.round(opened * c.clickRate);
      const bounced = Math.round(c.recipients * c.bounceRate);
      const unsub = Math.round(delivered * c.unsubRate);
      const sentAt = c.sentDaysAgo != null && c.sentDaysAgo >= 0 ? dateWithinDays(rng, c.sentDaysAgo, c.sentDaysAgo) : null;
      const scheduledAt = c.sentDaysAgo != null && c.sentDaysAgo < 0
        ? new Date(Date.now() + Math.abs(c.sentDaysAgo) * 24 * 60 * 60 * 1000)
        : null;
      return {
        __segment: c.segment,
        name: c.name,
        subject: c.subject,
        sender_name: "University Admissions Office",
        sender_email: "admissions@university.edu.pk",
        reply_to: "admissions@university.edu.pk",
        body_html: `<h1>${c.subject}</h1><p>This is demo campaign content for "${c.name}".</p>`,
        department_id: marketingDeptId,
        created_by: pick(rng, marketingOwners),
        status: c.status,
        scheduled_at: scheduledAt,
        sent_at: sentAt,
        recipients_count: c.recipients,
        delivered_count: delivered,
        opened_count: opened,
        clicked_count: clicked,
        bounced_count: bounced,
        unsubscribed_count: unsub,
        created_at: dateWithinDays(rng, 60, 5),
        updated_at: now,
      };
    });

    await queryInterface.bulkInsert(
      "campaigns",
      campaignRows.map(({ __segment, ...row }) => ({
        ...row,
        segment_id: segmentIds[__segment] || null,
      })),
      {}
    );

    // Representative recipient/event sample per sent campaign, so the
    // Campaign detail recipients tab and drill-down have real rows to page
    // through - full-scale counters above already carry the headline KPIs
    // (requirements #54: aggregate counters instead of literal 58k rows).
    const campaignIds = await idMapByColumn(queryInterface, "campaigns", "name");
    const [sampleContacts] = await queryInterface.sequelize.query(
      `SELECT id FROM contacts WHERE department_id = ${marketingDeptId} ORDER BY id LIMIT 1000`
    );

    const recipientRows = [];
    const eventRows = [];
    for (const c of CAMPAIGNS) {
      if (c.status !== "Sent") continue;
      const campaignId = campaignIds[c.name];
      const sampleSize = Math.min(120, sampleContacts.length);
      const sample = [...sampleContacts].sort(() => rng() - 0.5).slice(0, sampleSize);
      sample.forEach((contact, idx) => {
        const roll = rng();
        let status = "delivered";
        if (roll < c.clickRate * c.openRate) status = "clicked";
        else if (roll < c.openRate) status = "opened";
        else if (roll < c.bounceRate + c.openRate) status = "bounced";
        recipientRows.push({
          campaign_id: campaignId,
          contact_id: contact.id,
          status,
          created_at: now,
          updated_at: now,
        });
        eventRows.push({
          campaign_id: campaignId,
          contact_id: contact.id,
          type: "sent",
          occurred_at: dateWithinDays(rng, c.sentDaysAgo || 1, c.sentDaysAgo || 1),
          metadata: null,
          created_at: now,
        });
        if (status !== "delivered") {
          eventRows.push({
            campaign_id: campaignId,
            contact_id: contact.id,
            type: status === "clicked" ? "clicked" : status === "opened" ? "opened" : "bounced",
            occurred_at: dateWithinDays(rng, (c.sentDaysAgo || 1) - 1, 0),
            metadata: null,
            created_at: now,
          });
        }
      });
    }
    await queryInterface.bulkInsert("campaign_recipients", recipientRows, {});
    await queryInterface.bulkInsert("campaign_events", eventRows, {});
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("campaign_events", null, {});
    await queryInterface.bulkDelete("campaign_recipients", null, {});
    await queryInterface.bulkDelete("campaigns", null, {});
    await queryInterface.bulkDelete("segment_conditions", null, {});
    await queryInterface.bulkDelete("segments", null, {});
  },
};
