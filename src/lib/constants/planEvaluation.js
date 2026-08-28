// Demo / evaluation matrix (requirements #101). This is illustrative only -
// it must never be presented as an authoritative, current statement of
// Brevo pricing or feature availability. Always confirm directly with the
// vendor before relying on any of these figures.
export const PLANS = ["Starter", "Standard", "Professional", "Enterprise"];

export const EVALUATION_ROWS = [
  { feature: "58k+ contacts", values: ["Limited", "Yes", "Yes", "Yes"] },
  { feature: "High-volume email sending", values: ["Limited", "Yes", "Yes", "Yes"] },
  { feature: "Marketing automation", values: ["Basic", "Yes", "Yes", "Yes"] },
  { feature: "Advanced automation (branching, scoring)", values: ["No", "Limited", "Yes", "Yes"] },
  { feature: "Multiple users / seats", values: ["Limited", "Yes", "Yes", "Yes"] },
  { feature: "WhatsApp messaging", values: ["No", "Add-on", "Add-on", "Yes"] },
  { feature: "WhatsApp automation triggers", values: ["No", "No", "Limited", "Yes"] },
  { feature: "Contact / lead scoring", values: ["No", "Limited", "Yes", "Yes"] },
  { feature: "Advanced analytics & reporting", values: ["Basic", "Basic", "Yes", "Yes"] },
  { feature: "Custom objects", values: ["No", "No", "Limited", "Yes"] },
  { feature: "Single sign-on (SSO / SAML)", values: ["No", "No", "Limited", "Yes"] },
  { feature: "Advanced role-based permissions", values: ["No", "Basic", "Yes", "Yes"] },
  { feature: "B2B sales CRM / pipelines", values: ["No", "Basic", "Yes", "Yes"] },
  { feature: "University-wide scalability", values: ["No", "Limited", "Yes", "Yes"] },
];
