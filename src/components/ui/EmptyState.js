import { Inbox } from "lucide-react";
import { getTone } from "@/lib/constants/moduleColors";

// Every list in the app renders this instead of a blank page when there's
// no data (requirements #86) - always paired with a next action when one
// makes sense. `tone` optionally colors the icon to match the module it's
// in (a blank Deals list gets a cyan icon, not the same grey every empty
// state used to share).
export default function EmptyState({ icon: Icon = Inbox, title, description, action, tone = "neutral" }) {
  const { icon: iconColor, bg: iconBg } = getTone(tone);
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className={["flex size-12 items-center justify-center rounded-full border border-border mb-4", iconBg].join(" ")}>
        <Icon className={["size-5", iconColor].join(" ")} aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
