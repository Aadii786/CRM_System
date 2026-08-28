const TONES = {
  neutral: "bg-surface-alt text-ink-secondary border-border",
  primary: "bg-primary-subtle text-primary-active border-primary-border",
  success: "bg-success-subtle text-success border-success-border",
  warning: "bg-warning-subtle text-warning border-warning-border",
  danger: "bg-danger-subtle text-danger border-danger-border",
  info: "bg-info-subtle text-info border-info-border",
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

export default function Badge({ tone, status, className = "", children }) {
  const resolvedTone = tone || (status ? toneForStatus(status) : "neutral");
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
