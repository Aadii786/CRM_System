import Link from "next/link";
import { Handshake, CheckSquare, CalendarDays, MessageCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, formatDateTime, formatCurrencyPKR } from "@/lib/utils/format";

function Section({ title, icon: Icon, children, empty }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink mb-3">
        <Icon className="size-4 text-ink-muted" /> {title}
      </h3>
      {children || <p className="text-sm text-ink-muted">{empty}</p>}
    </div>
  );
}

export default function ContactRelated({ deals, tasks, meetings, conversation }) {
  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Section title="Deals" icon={Handshake} empty="No related deals.">
        {deals.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm gap-2">
                <span className="min-w-0">
                  <Link href={`/deals/${d.id}`} className="text-primary hover:underline truncate block">{d.name}</Link>
                  {d.referenceNumber && <span className="text-[11px] font-mono text-ink-muted">{d.referenceNumber}</span>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <Badge tone="neutral">{d.stage?.name}</Badge>
                  <span className="text-ink-secondary tabular-nums">{formatCurrencyPKR(d.value)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Tasks" icon={CheckSquare} empty="No related tasks.">
        {tasks.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-ink truncate">{t.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Badge status={t.status} />
                  <span className="text-ink-muted text-xs">{formatDate(t.dueDate)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Meetings" icon={CalendarDays} empty="No related meetings.">
        {meetings.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-ink truncate">{m.title}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <Badge status={m.status} />
                  <span className="text-ink-muted text-xs">{formatDateTime(m.startAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="WhatsApp Conversation" icon={MessageCircle} empty="No conversation started yet.">
        {conversation && (
          <Link href="/conversations" className="flex items-center justify-between text-sm">
            <span className="text-ink truncate">{conversation.lastMessagePreview || "Conversation"}</span>
            <Badge status={conversation.status === "open" ? "New" : conversation.status === "closed" ? "Inactive" : "Engaged"}>{conversation.status}</Badge>
          </Link>
        )}
      </Section>
    </div>
  );
}
