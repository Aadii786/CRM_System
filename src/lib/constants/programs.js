"use strict";

// Program catalogue vocabulary (IKL Sprint 2). Kept as plain constants so the
// catalogue, batches, interests and filters all use the same words.

// IKL's own category list (answer to Q6).
const PROGRAM_CATEGORIES = [
  "HR & People Management",
  "Professional Development",
  "Leadership & Management",
  "Strategy & Organizational Development",
  "Sales & Marketing",
  "Customer Service",
  "Finance",
  "Supply Chain & Operations",
  "Project Management",
  "Digital / AI / Data & Technology",
  "ESG / Sustainability",
  "Employee Wellbeing",
  "Certifications",
  "Customized In-house Training / Consultancy",
];

// Open-enrollment programs run repeatedly as batches; certificate programs are
// open-enrollment with a completion certificate; in-house programs are
// delivered for one corporate client (recorded as engagements on a deal).
const PROGRAM_TYPES = ["Open enrollment", "Certificate program", "In-house"];

const PROGRAM_STATUSES = ["Active", "Archived"];

const BATCH_STATUSES = ["Planned", "Open for registration", "Running", "Completed", "Cancelled"];

module.exports = { PROGRAM_CATEGORIES, PROGRAM_TYPES, PROGRAM_STATUSES, BATCH_STATUSES };
