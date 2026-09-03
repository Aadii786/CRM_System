"use strict";

// Shared CRM vocabulary used across models, services, seeders and the UI.
// Keeping these lists in one place means the DB ENUMs, the filter dropdowns,
// and the segment/report builders never drift apart.

const LEAD_SOURCES = [
  "Client Visit",
  "Social Media",
  "LinkedIn",
  "Phone Call",
  "Email",
  "Website",
  "Event",
  "Referral",
  "Other",
];

const CONTACT_STATUSES = [
  "New",
  "Engaged",
  "Interested",
  "Qualified",
  "Inactive",
  "Converted",
  "Unsubscribed",
  "Bounced",
];

const ENGAGEMENT_STATUSES = [
  "Delivered",
  "Opened",
  "Clicked",
  "Bounced",
  "Unsubscribed",
  "Engaged",
  "Inactive",
];

const TRAINING_TYPES = [
  { key: "ODC", name: "Open Development Course" },
  { key: "OB", name: "Open Batch" },
  { key: "OEP", name: "Open Executive Program" },
  { key: "CP", name: "Corporate Program" },
  { key: "Consultancy", name: "Consultancy" },
];

const ORGANIZATION_TYPES = [
  "Corporate",
  "Government",
  "University",
  "Training Organization",
  "NGO",
  "Other",
];

// Brevo-parity contact fields (requirements: match the detail captured on
// contact creation - CONTACT_TIMEZONE, DETECTED_LANGUAGE, DOUBLE_OPT_IN, OPT_IN).
const CONTACT_TIMEZONES = [
  { value: "Asia/Karachi", label: "Asia/Karachi (PKT, UTC+5)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST, UTC+3)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (UTC+6)" },
  { value: "Asia/Colombo", label: "Asia/Colombo (UTC+5:30)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
];

const DETECTED_LANGUAGES = ["English", "Urdu", "Arabic", "French", "Chinese", "Other"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const CONTACT_TYPES = ["Lead", "Prospect", "Customer", "Partner", "Other"];
const DOUBLE_OPT_IN_OPTIONS = ["Yes", "No"];
const OPT_IN_OPTIONS = ["Opted In", "Opted Out", "Unknown"];

const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue", "Cancelled"];

// IKL/HSM B2B pipeline stage set (requirements #32).
const IKL_HSM_PIPELINE_STAGES = [
  { key: "new_inquiry", name: "New Inquiry", probability: 5 },
  { key: "meeting_scheduled", name: "Meeting Scheduled", probability: 10 },
  { key: "requirement_identified", name: "Requirement Identified", probability: 15 },
  { key: "training_type_selected", name: "Training Type Selected", probability: 20 },
  { key: "trainer_identified", name: "Trainer Identified", probability: 25 },
  { key: "initial_proposal", name: "Initial Proposal", probability: 35 },
  { key: "tna", name: "TNA", probability: 40 },
  { key: "final_proposal", name: "Final Proposal", probability: 50 },
  { key: "proposal_sent", name: "Proposal Sent", probability: 60 },
  { key: "accepted", name: "Accepted", probability: 75 },
  // Explicit approval gate (IKL requirements doc's proposed workflow:
  // "...B2B Plan/Proposal -> Approval -> Initiation & Execution...").
  // Moving a deal OUT of this stage requires the deals.approve permission,
  // which only IKL/HSM Managers hold - Executives can advance a deal INTO
  // Approval, but only a Manager can release it into Execution.
  { key: "approval", name: "Approval", probability: 80 },
  { key: "execution", name: "Execution", probability: 85 },
  { key: "feedback", name: "Feedback", probability: 90 },
  { key: "invoice", name: "Invoice", probability: 92 },
  { key: "payment_pending", name: "Payment Pending", probability: 95 },
  { key: "payment_received", name: "Payment Received", probability: 99, isWon: false },
  { key: "completed", name: "Completed", probability: 100, isWon: true },
  // A query can be rejected from any stage of evaluation (IKL requirements
  // doc: query status must include Received -> Under Discussion ->
  // Evaluated -> Accepted/Rejected) - reachable via the stage dropdown or
  // drag-and-drop from wherever the deal currently sits, same as "Lost" on
  // the Consultancy pipeline below.
  { key: "rejected", name: "Rejected", probability: 0, isLost: true },
];

// Simpler consultancy-only pipeline, to demonstrate the multi-pipeline
// architecture (requirements #33) without duplicating every training stage.
const CONSULTANCY_PIPELINE_STAGES = [
  { key: "inquiry", name: "Inquiry", probability: 10 },
  { key: "scoping", name: "Scoping Call", probability: 25 },
  { key: "proposal", name: "Proposal", probability: 45 },
  { key: "negotiation", name: "Negotiation", probability: 65 },
  { key: "won", name: "Won", probability: 100, isWon: true },
  { key: "lost", name: "Lost", probability: 0, isLost: true },
];

module.exports = {
  LEAD_SOURCES,
  CONTACT_STATUSES,
  ENGAGEMENT_STATUSES,
  CONTACT_TIMEZONES,
  DETECTED_LANGUAGES,
  DOUBLE_OPT_IN_OPTIONS,
  OPT_IN_OPTIONS,
  COMPANY_SIZES,
  CONTACT_TYPES,
  TRAINING_TYPES,
  ORGANIZATION_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  IKL_HSM_PIPELINE_STAGES,
  CONSULTANCY_PIPELINE_STAGES,
};
