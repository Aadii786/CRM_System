import { departmentTone } from "@/lib/constants/moduleColors";

const TONES = {
  neutral: "bg-surface-alt text-ink-secondary border-border",
  primary: "bg-primary-subtle text-primary-active border-primary-border",
  success: "bg-success-subtle text-success border-success-border",
  warning: "bg-warning-subtle text-warning border-warning-border",
  danger: "bg-danger-subtle text-danger border-danger-border",
  info: "bg-info-subtle text-info border-info-border",
  // Module/department accents (see lib/constants/moduleColors.js) - same
  // subtle-background/solid-text pairing as the status tones above, but
  // for "which part of the CRM is this" rather than good/bad/warning.
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

// Maps the CRM's own status vocabularies to a semantic tone, so the same
// word always renders the same color everywhere in the app.
const STATUS_TONE_MAP = {
  // Contact statuses
  New: "info",
  Engaged: "primary",
  Interested: "primary",
  Qualified: "success",
  Inactive: "neutral",
  Converted: "success",
  Unsubscribed: "danger",
  Bounced: "danger",
  // Campaign / automation / import / generic
  Draft: "neutral",
  Scheduled: "info",
  Sending: "primary",
  Sent: "success",
  Paused: "warning",
  Failed: "danger",
  Active: "success",
  Archived: "neutral",
  // Task
  Pending: "neutral",
  "In Progress": "primary",
  Completed: "success",
  Overdue: "danger",
  Cancelled: "neutral",
  // Deal
  open: "info",
  won: "success",
  lost: "danger",
  // Invoice / payment
  Unpaid: "danger",
  Partial: "warning",
  Paid: "success",
  Prospect: "warning",
};

export function toneForStatus(status) {
  return STATUS_TONE_MAP[status] || "neutral";
}

/**
 * `department` (a department key like "marketing" or "ikl-hsm") auto-picks
 * that department's color from the shared catalog, so every department
 * badge/pill in the app - Contacts list, Users, Companies, Deals - reads
 * consistently without each screen re-deciding a color.
 */
export default function Badge({ tone, status, department, className = "", children }) {
  const resolvedTone = tone || (department ? departmentTone(department) : status ? toneForStatus(status) : "neutral");
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-5",
        TONES[resolvedTone] || TONES.neutral,
        className,
      ].join(" ")}
    >
      {children ?? status}
    </span>
  );
}
