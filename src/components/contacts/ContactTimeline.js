import {
  Mail, MessageCircle, Phone, CalendarDays, StickyNote, CheckSquare,
  Megaphone, Workflow, Handshake, FileText, CreditCard, Activity as ActivityIcon,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime, formatDate } from "@/lib/utils/format";

const ICONS = {
  email: Mail,
  whatsapp: MessageCircle,
  call: Phone,
  meeting: CalendarDays,
  note: StickyNote,
  task: CheckSquare,
  campaign: Megaphone,
  automation: Workflow,
  deal_stage: Handshake,
  proposal: FileText,
  payment: CreditCard,
  status_change: ActivityIcon,
  lead_score: ActivityIcon,
  import: ActivityIcon,
  system: ActivityIcon,
};

function groupByDay(activities) {
  const groups = new Map();
  for (const a of activities) {
    const key = formatDate(a.occurredAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  return Array.from(groups.entries());
}

/** Polished chronological activity timeline (requirements #16, #81). */
export default function ContactTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return <EmptyState title="No activity yet" description="Emails, WhatsApp messages, tasks and status changes will show up here." />;
  }

  const grouped = groupByDay(activities);

  return (
    <div className="flex flex-col gap-6">
      {grouped.map(([day, items]) => (
        <div key={day}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">{day}</p>
          <div className="relative flex flex-col gap-4 pl-6 border-l border-border">
            {items.map((a) => {
              const Icon = ICONS[a.type] || ActivityIcon;
              return (
                <div key={a.id} className="relative">
                  <span className="absolute -left-[29px] top-0.5 flex size-5 items-center justify-center rounded-full bg-primary-subtle border border-primary-border text-primary-active">
                    <Icon className="size-3" />
                  </span>
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  {a.description && <p className="text-sm text-ink-muted mt-0.5">{a.description}</p>}
                  <p className="text-xs text-ink-muted mt-0.5">
                    {formatDateTime(a.occurredAt)} {a.User && `· ${a.User.name}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
