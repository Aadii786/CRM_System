import { Inbox } from "lucide-react";

// Every list in the app renders this instead of a blank page when there's
// no data (requirements #86) - always paired with a next action when one
// makes sense.
export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-alt border border-border mb-4">
        <Icon className="size-5 text-ink-muted" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
