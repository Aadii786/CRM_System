import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listSegments } from "@/lib/services/segmentService";
import PageHeader from "@/components/common/PageHeader";
import SegmentsPageClient from "@/components/segments/SegmentsPageClient";

export const metadata = { title: "Segments" };

export default async function SegmentsPage() {
  const user = await requireUserWithPermission("segments.view");
  const segmentsRaw = await listSegments(user);
  const segments = segmentsRaw.map((s) => s.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Segments"
        description="Reusable audience definitions used across campaigns and automations."
      />
      <SegmentsPageClient segments={segments} departmentKey={user.department?.key} canManage={hasPermission(user, "segments.create")} />
    </div>
  );
}
