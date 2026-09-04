"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Send, UserCheck, MessageCircle, RefreshCcw } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Select, Textarea } from "@/components/ui/Field";
import { replyInConversationAction, simulateInboundReplyAction, assignConversationAction } from "@/actions/engagement";
import { useToast } from "@/components/ui/Toast";
import { timeAgo, formatDateTime } from "@/lib/utils/format";

export default function WhatsAppInbox({ conversations, users, currentUserId, canAssign }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? null);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!query) return true;
      const name = `${c.Contact?.firstName} ${c.Contact?.lastName}`.toLowerCase();
      return name.includes(query.toLowerCase());
    });
  }, [conversations, query, statusFilter]);

  const selected = conversations.find((c) => c.id === selectedId) || filtered[0] || null;

  function sendReply() {
    if (!replyText.trim() || !selected) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("conversationId", selected.id);
      fd.set("body", replyText.trim());
      await replyInConversationAction(fd);
      setReplyText("");
      push("Message sent.");
      router.refresh();
    });
  }

  function simulateReply() {
    if (!selected) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("conversationId", selected.id);
      await simulateInboundReplyAction(fd);
      push("Simulated inbound reply - contact auto-qualified.");
      router.refresh();
    });
  }

  function assign(userId) {
    if (!selected) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("conversationId", selected.id);
      fd.set("assigneeId", userId);
      await assignConversationAction(fd);
      push("Conversation assigned.");
      router.refresh();
    });
  }

  if (conversations.length === 0) {
    return <EmptyState icon={MessageCircle} tone="green" title="No conversations yet" description="WhatsApp conversations will appear here once contacts start replying." />;
  }

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-0 rounded-lg border border-border overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
      {/* Conversation list */}
      <div className="flex flex-col border-r border-border bg-surface">
        <div className="p-3 border-b border-border flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="h-8 w-full rounded-md border border-border-strong bg-surface-alt pl-8 pr-2 text-sm"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 text-xs">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={["w-full text-left flex items-start gap-2.5 px-3 py-3 border-b border-border hover:bg-surface-alt transition-colors", selected?.id === c.id ? "bg-primary-subtle/60" : ""].join(" ")}
            >
              <Avatar name={`${c.Contact?.firstName} ${c.Contact?.lastName}`} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink truncate">{c.Contact?.firstName} {c.Contact?.lastName}</p>
                  <span className="text-[10px] text-ink-muted shrink-0">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-ink-muted truncate">{c.lastMessagePreview}</p>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white shrink-0">{c.unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation panel */}
      {!selected ? (
        <div className="flex items-center justify-center text-sm text-ink-muted">Select a conversation</div>
      ) : (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={`${selected.Contact?.firstName} ${selected.Contact?.lastName}`} size="sm" />
              <div className="min-w-0">
                <Link href={`/contacts/${selected.Contact?.id}`} className="text-sm font-medium text-ink hover:text-primary truncate block">
                  {selected.Contact?.firstName} {selected.Contact?.lastName}
                </Link>
                <p className="text-xs text-ink-muted truncate">{selected.Contact?.whatsappNumber || selected.Contact?.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge status={selected.status === "open" ? "New" : selected.status === "closed" ? "Inactive" : "Engaged"}>{selected.status}</Badge>
              {canAssign && (
                <Select value={selected.assignedTo || ""} onChange={(e) => assign(e.target.value)} className="h-8 text-xs w-36">
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface-alt/40">
            {selected.messages.map((m) => (
              <div key={m.id} className={["max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm", m.direction === "outbound" ? "self-end bg-primary text-white" : "self-start bg-surface border border-border text-ink"].join(" ")}>
                <p>{m.body}</p>
                <p className={["text-[10px] mt-1", m.direction === "outbound" ? "text-white/70" : "text-ink-muted"].join(" ")}>{formatDateTime(m.sentAt)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3 flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Type a reply..." className="flex-1" />
              <button onClick={sendReply} disabled={isPending || !replyText.trim()} aria-label="Send" className="flex size-9 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50 shrink-0">
                <Send className="size-4" />
              </button>
            </div>
            <button onClick={simulateReply} disabled={isPending} className="self-start inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-primary">
              <RefreshCcw className="size-3.5" /> Simulate contact reply (demo trigger for automation)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
