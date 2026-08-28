import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listSegments } from "@/lib/services/segmentService";
import PageHeader from "@/components/common/PageHeader";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

export const metadata = { title: "Create Campaign" };

export default async function NewCampaignPage() {
  const user = await requireUserWithPermission("campaigns.create");
  const segmentsRaw = await listSegments(user);
  const segments = segmentsRaw.map((s) => s.get({ plain: true }));

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: "New Campaign" }]}
        title="Create Campaign"
        description="Build and schedule a new email campaign."
      />
      <CampaignWizard segments={segments} />
    </div>
  );
}
