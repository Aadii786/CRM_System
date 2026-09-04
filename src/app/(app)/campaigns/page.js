import Link from "next/link";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listCampaigns } from "@/lib/services/campaignService";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import UrlSelect from "@/components/ui/UrlSelect";
import Pagination from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { Megaphone, Plus } from "lucide-react";
import { formatDate, formatPercent } from "@/lib/utils/format";

export const metadata = { title: "Campaigns" };

const STATUSES = ["Draft", "Scheduled", "Sending", "Sent", "Paused", "Failed"];

export default async function CampaignsPage({ searchParams }) {
  const user = await requireUserWithPermission("campaigns.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: campaignsRaw, pagination } = await listCampaigns(user, { status: sp.status || undefined, page, limit: 20 });
  const campaigns = campaignsRaw.map((c) => c.get({ plain: true }));

  function buildHref(targetPage) {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    params.set("page", String(Math.max(1, targetPage)));
    return `/campaigns?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Email campaign management, analytics and the mandatory 3-email nurture sequence."
        actions={hasPermission(user, "campaigns.create") && <Button href="/campaigns/new" variant="primary" icon={Plus}>Create Campaign</Button>}
      />

      <FilterBar>
        <UrlSelect paramName="status" allLabel="All statuses" options={STATUSES.map((s) => ({ value: s, label: s }))} className="w-40" />
      </FilterBar>

      <DataTable
        columns={[
          { key: "name", header: "Campaign", render: (c) => (
            <Link href={`/campaigns/${c.id}`} className="font-medium text-ink hover:text-primary">{c.name}</Link>
          ) },
          { key: "audience", header: "Audience", render: (c) => c.Segment?.name || "All Contacts" },
          { key: "status", header: "Status", render: (c) => <Badge status={c.status} /> },
          { key: "sent", header: "Sent", render: (c) => c.recipientsCount.toLocaleString() },
          { key: "delivered", header: "Delivered", render: (c) => c.deliveredCount.toLocaleString() },
          { key: "opens", header: "Opens", render: (c) => `${c.openedCount.toLocaleString()} (${formatPercent(c.deliveredCount ? (c.openedCount / c.deliveredCount) * 100 : 0)})` },
          { key: "clicks", header: "Clicks", render: (c) => `${c.clickedCount.toLocaleString()} (${formatPercent(c.deliveredCount ? (c.clickedCount / c.deliveredCount) * 100 : 0)})` },
          { key: "date", header: "Date", render: (c) => formatDate(c.sentAt || c.scheduledAt || c.createdAt) },
        ]}
        rows={campaigns}
        emptyState={
          <EmptyState
            icon={Megaphone}
            tone="purple"
            title="No campaigns found"
            description="Create your first campaign to start engaging your contacts."
            action={hasPermission(user, "campaigns.create") && <Button href="/campaigns/new" variant="primary" icon={Plus}>Create Campaign</Button>}
          />
        }
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} buildHref={buildHref} />
    </div>
  );
}
