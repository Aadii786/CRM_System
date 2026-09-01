import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { listSegments } from "@/lib/services/segmentService";
import { departmentByKey } from "@/lib/services/departmentService";
import PageHeader from "@/components/common/PageHeader";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

export const metadata = { title: "Create Campaign" };

export default async function NewCampaignPage() {
  const user = await requireUserWithPermission("campaigns.create");
  const [segmentsRaw, dept] = await Promise.all([
    listSegments(user),
    departmentByKey(user.department?.key),
  ]);
  const segments = segmentsRaw.map((s) => s.get({ plain: true }));
  // Every department sends from its own identity, not a shared university
  // address - the wizard defaults to whichever department the current user
  // belongs to and lets them override per-campaign if needed.
  const defaultSender = dept ? { senderName: dept.senderName, senderEmail: dept.senderEmail, replyTo: dept.replyTo } : null;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: "New Campaign" }]}
        title="Create Campaign"
        description="Build and schedule a new email campaign."
      />
      <CampaignWizard segments={segments} defaultSender={defaultSender} />
    </div>
  );
}
