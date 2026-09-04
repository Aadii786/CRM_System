"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, MessageCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, formatNumber } from "@/lib/utils/format";
import { bulkUpdateContactStatusAction } from "@/actions/contacts";
import { useToast } from "@/components/ui/Toast";

export default function ContactsTable({ contacts, canEdit }) {
  const [selected, setSelected] = useState(new Set());
  const { push } = useToast();
  const router = useRouter();

  if (contacts.length === 0) {
    return (
      <EmptyState
        tone="blue"
        title="No contacts found"
        description="Try adjusting your search or filters, or import contacts to get started."
      />
    );
  }

  function toggleAll(checked) {
    setSelected(checked ? new Set(contacts.map((c) => c.id)) : new Set());
  }
  function toggleOne(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBulk(status) {
    const formData = new FormData();
    Array.from(selected).forEach((id) => formData.append("ids", id));
    formData.set("status", status);
    await bulkUpdateContactStatusAction(formData);
    push(`${selected.size} contact(s) updated to ${status}.`);
    setSelected(new Set());
    router.refresh();
  }

  const allChecked = selected.size > 0 && selected.size === contacts.length;

  return (
    <div className="flex flex-col gap-2">
      {canEdit && selected.size > 0 && (
        <div className="flex items-center gap-2.5 rounded-md border border-primary-border bg-primary-subtle px-3.5 py-2 text-sm">
          <span className="font-medium text-primary-active">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => handleBulk("Qualified")} className="rounded-md px-2.5 py-1 text-xs font-medium text-ink bg-surface border border-border-strong hover:bg-surface-alt">
              Mark Qualified
            </button>
            <button onClick={() => handleBulk("Engaged")} className="rounded-md px-2.5 py-1 text-xs font-medium text-ink bg-surface border border-border-strong hover:bg-surface-alt">
              Mark Engaged
            </button>
            <button onClick={() => handleBulk("Unsubscribed")} className="rounded-md px-2.5 py-1 text-xs font-medium text-danger bg-surface border border-border-strong hover:bg-danger-subtle">
              Unsubscribe
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm table-sticky-header">
          <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              {canEdit && (
                <th className="w-10 px-4 py-2.5 border-b border-border">
                  <Checkbox checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                </th>
              )}
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Name</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Company</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Status</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Engagement</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Source</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Score</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Owner</th>
              <th className="px-4 py-2.5 text-left font-medium border-b border-border">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((c) => (
              <tr key={c.id} className="bg-surface hover:bg-surface-alt transition-colors">
                {canEdit && (
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(c.id)} onChange={(e) => toggleOne(c.id, e.target.checked)} aria-label={`Select ${c.firstName}`} />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="flex items-center gap-2.5 group">
                    <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                    <span>
                      <span className="block font-medium text-ink group-hover:text-primary transition-colors">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="block text-xs text-ink-muted">{c.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-secondary">{c.Company?.name || "—"}</td>
                <td className="px-4 py-3">
                  <Badge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <Badge tone="neutral">{c.engagementStatus}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-secondary">{c.source}</td>
                <td className="px-4 py-3 tabular-nums font-medium text-ink">{formatNumber(c.leadScore)}</td>
                <td className="px-4 py-3">
                  {c.owner ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={c.owner.name} color={c.owner.avatarColor} size="xs" />
                      <span className="text-xs text-ink-secondary truncate max-w-[100px]">{c.owner.name}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">{formatDate(c.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
