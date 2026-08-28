import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getCampaign, getCampaignRecipients } from "@/lib/services/campaignService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import FunnelBars from "@/components/charts/FunnelBars";
import DataTable from "@/components/ui/DataTable";
import CampaignActions from "@/components/campaigns/CampaignActions";
import { formatDate, formatPercent } from "@/lib/utils/format";
import { Send, Eye, MousePointerClick, XCircle } from "lucide-react";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Campaign ${id}` };
}

export default async function CampaignDetailPage({ params }) {
  const user = await requireUserWithPermission("campaigns.view");
  const { id } = await params;

  const campaignRaw = await getCampaign(user, id);
  if (!campaignRaw) notFound();
  const campaign = campaignRaw.get({ plain: true });

  const recipientsRaw = await getCampaignRecipients(user, id, 100);
  const recipients = recipientsRaw.map((r) => r.get({ plain: true }));

  const funnelStages = [
    { label: "Sent", value: campaign.recipientsCount },
    { label: "Delivered", value: campaign.deliveredCount },
    { label: "Opened", value: campaign.openedCount },
    { label: "Clicked", value: campaign.clickedCount },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: campaign.name }]}
        title={campaign.name}
        description={campaign.subject}
        actions={
          <>
            <Badge status={campaign.status} />
            <CampaignActions campaign={campaign} canSend={hasPermission(user, "campaigns.send")} />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <MetricCard label="Recipients" value={campaign.recipientsCount.toLocaleString()} icon={Send} />
        <MetricCard label="Open Rate" value={formatPercent(campaign.deliveredCount ? (campaign.openedCount / campaign.deliveredCount) * 100 : 0)} icon={Eye} />
        <MetricCard label="Click Rate" value={formatPercent(campaign.deliveredCount ? (campaign.clickedCount / campaign.deliveredCount) * 100 : 0)} icon={MousePointerClick} />
        <MetricCard label="Bounced" value={campaign.bouncedCount.toLocaleString()} icon={XCircle} />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4">Delivery Funnel</h3>
          <FunnelBars stages={funnelStages} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-4">Campaign Details</h3>
          <dl className="flex flex-col divide-y divide-border">
            <DetailRow label="Sender" value={`${campaign.senderName} <${campaign.senderEmail}>`} />
            <DetailRow label="Reply-To" value={campaign.replyTo} />
            <DetailRow label="Audience" value={campaign.Segment?.name || "All Contacts"} />
            <DetailRow label="Unsubscribed" value={campaign.unsubscribedCount.toLocaleString()} />
            <DetailRow label="Sent At" value={campaign.sentAt ? formatDate(campaign.sentAt) : "Not sent yet"} />
            <DetailRow label="Created By" value={campaign.creator?.name || "—"} />
          </dl>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-5 pb-0">
          <h3 className="text-sm font-semibold text-ink mb-1">Recipients</h3>
          <p className="text-xs text-ink-muted mb-4">Showing a sample of up to 100 recipients for this campaign.</p>
        </div>
        <div className="px-5 pb-5">
          <DataTable
            columns={[
              { key: "name", header: "Contact", render: (r) => `${r.Contact?.firstName} ${r.Contact?.lastName}` },
              { key: "email", header: "Email", render: (r) => r.Contact?.email },
              { key: "status", header: "Status", render: (r) => <Badge status={r.status === "clicked" ? "Converted" : r.status === "opened" ? "Engaged" : r.status === "bounced" ? "Bounced" : "New"}>{r.status}</Badge> },
            ]}
            rows={recipients}
          />
        </div>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value}</span>
    </div>
  );
}
