"use strict";

// Integration catalog (requirements #46) - classified native / third_party / api
// per the requirement to distinguish integration types. All start
// "disconnected" or "config_required": this is a demo, nothing here ever
// calls a real external API (requirements #106).
const INTEGRATIONS = [
  { key: "gmail", name: "Gmail", category: "third_party", status: "disconnected" },
  { key: "outlook", name: "Microsoft Outlook", category: "third_party", status: "disconnected" },
  { key: "smtp", name: "Custom SMTP", category: "native", status: "config_required" },
  { key: "website", name: "University Website Forms", category: "native", status: "connected" },
  { key: "facebook", name: "Facebook", category: "third_party", status: "disconnected" },
  { key: "instagram", name: "Instagram", category: "third_party", status: "disconnected" },
  { key: "linkedin", name: "LinkedIn", category: "third_party", status: "disconnected" },
  { key: "whatsapp", name: "WhatsApp Business", category: "third_party", status: "config_required" },
  { key: "google", name: "Google Workspace SSO", category: "third_party", status: "disconnected" },
  { key: "api", name: "REST API", category: "api", status: "connected" },
  { key: "webhooks", name: "Webhooks", category: "api", status: "connected" },
];

const SETTINGS = [
  { category: "general", key: "organization_name", value: JSON.stringify("University") },
  { category: "general", key: "timezone", value: JSON.stringify("Asia/Karachi") },
  { category: "lead_scoring", key: "rules", value: JSON.stringify([
    { event: "Email opened", points: 5 },
    { event: "Email clicked", points: 10 },
    { event: "Website visit", points: 8 },
    { event: "Form submission", points: 15 },
    { event: "WhatsApp reply", points: 20 },
    { event: "Meeting attended", points: 25 },
  ]) },
  { category: "lead_scoring", key: "qualified_threshold", value: JSON.stringify(70) },
  { category: "security", key: "mfa", value: JSON.stringify({ status: "available", tier: "Professional+" }) },
  { category: "security", key: "sso", value: JSON.stringify({ status: "available", tier: "Enterprise" }) },
  { category: "security", key: "saml", value: JSON.stringify({ status: "available", tier: "Enterprise" }) },
  { category: "data_retention", key: "contacts", value: JSON.stringify({ months: 36 }) },
  { category: "data_retention", key: "email_events", value: JSON.stringify({ months: 24 }) },
  { category: "data_retention", key: "automation_logs", value: JSON.stringify({ months: 12 }) },
  { category: "data_retention", key: "campaign_reports", value: JSON.stringify({ months: 24 }) },
];

// Custom object *definitions* (requirements #49). The underlying data for
// Training Program / Trainer / TNA / Proposal / Participant / Invoice /
// Payment / Trainer Remuneration lives in first-class tables (see the
// `training`/`financial` migrations) for referential integrity and
// reporting performance - these rows document the schema in Settings >
// Custom Data so the "custom object" concept from the requirements is
// still visibly represented, without duplicating storage.
const CUSTOM_OBJECTS = [
  { key: "training_program", name: "Training Program", description: "A scheduled training engagement delivered for a company.", schema: ["title", "trainingType", "trainer", "startDate", "endDate", "status"] },
  { key: "trainer", name: "Trainer", description: "An internal or external subject-matter trainer.", schema: ["name", "specialization", "remunerationRate"] },
  { key: "tna", name: "TNA", description: "Training Needs Assessment captured against a deal.", schema: ["requirement", "assessment", "responsiblePerson", "status"] },
  { key: "proposal", name: "Proposal", description: "Initial or final commercial proposal for a deal.", schema: ["type", "value", "sentDate", "status"] },
  { key: "participant", name: "Participant", description: "An individual attendee of a training program.", schema: ["name", "designation", "organization", "attendance"] },
  { key: "invoice", name: "Invoice", description: "A billable invoice raised against a deal.", schema: ["invoiceNumber", "amount", "status", "dueDate"] },
  { key: "payment", name: "Payment", description: "A payment received against an invoice.", schema: ["amount", "method", "paidAt"] },
  { key: "trainer_remuneration", name: "Trainer Remuneration", description: "Amount owed/paid to a trainer for a program.", schema: ["amount", "status", "paidAt"] },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert(
      "integrations",
      INTEGRATIONS.map((i) => ({
        key: i.key,
        name: i.name,
        category: i.category,
        status: i.status,
        config: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      })),
      {}
    );

    await queryInterface.bulkInsert(
      "settings",
      SETTINGS.map((s) => ({ ...s, created_at: now, updated_at: now })),
      {}
    );

    await queryInterface.bulkInsert(
      "custom_objects",
      CUSTOM_OBJECTS.map((c) => ({
        key: c.key,
        name: c.name,
        description: c.description,
        schema: JSON.stringify(c.schema),
        created_at: now,
        updated_at: now,
      })),
      {}
    );
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete("custom_objects", null, {});
    await queryInterface.bulkDelete("settings", null, {});
    await queryInterface.bulkDelete("integrations", null, {});
  },
};
