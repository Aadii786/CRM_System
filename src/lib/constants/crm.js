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
  { key: "execution", name: "Execution", probability: 85 },
  { key: "feedback", name: "Feedback", probability: 90 },
  { key: "invoice", name: "Invoice", probability: 92 },
  { key: "payment_pending", name: "Payment Pending", probability: 95 },
  { key: "payment_received", name: "Payment Received", probability: 99, isWon: false },
  { key: "completed", name: "Completed", probability: 100, isWon: true },
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
  TRAINING_TYPES,
  ORGANIZATION_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  IKL_HSM_PIPELINE_STAGES,
  CONSULTANCY_PIPELINE_STAGES,
};
