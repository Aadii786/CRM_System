import { Mail, MousePointerClick, MessageCircle, Globe } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Icon className="size-4 text-ink-muted mb-2" />
      <p className="text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default function ContactEngagement({ contact, campaignRecipients }) {
  const opens = campaignRecipients.filter((r) => ["opened", "clicked"].includes(r.status)).length;
  const clicks = campaignRecipients.filter((r) => r.status === "clicked").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Mail} label="Campaigns Received" value={campaignRecipients.length} />
        <StatTile icon={Globe} label="Emails Opened" value={opens} />
        <StatTile icon={MousePointerClick} label="Links Clicked" value={clicks} />
        <StatTile icon={MessageCircle} label="Engagement Status" value={<Badge tone="neutral">{contact.engagementStatus}</Badge>} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-2.5">Campaign History</h3>
        {campaignRecipients.length === 0 ? (
          <EmptyState title="No campaigns yet" description="This contact hasn't received any campaigns." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Campaign</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaignRecipients.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/campaigns/${r.Campaign?.id}`} className="text-primary hover:underline">
                        {r.Campaign?.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === "clicked" ? "success" : r.status === "opened" ? "primary" : r.status === "bounced" ? "danger" : "neutral"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-secondary">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
