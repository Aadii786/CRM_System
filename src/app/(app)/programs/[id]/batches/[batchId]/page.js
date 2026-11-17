import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getBatchRoster } from "@/lib/services/registrationService";
import { listCompanyOptions } from "@/lib/services/companyService";
import PageHeader from "@/components/common/PageHeader";
import Badge from "@/components/ui/Badge";
import BatchRoster from "@/components/programs/BatchRoster";
import { formatDate } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { batchId } = await params;
  return { title: `Batch ${batchId}` };
}

export default async function BatchRosterPage({ params }) {
  const user = await requireUserWithPermission("programs.view");
  const { id, batchId } = await params;

  let roster;
  try {
    roster = await getBatchRoster(user, batchId);
  } catch (err) {
    // Only a missing batch is a 404; permission and database problems must surface, not hide.
    if (/not found/i.test(err?.message || "")) notFound();
    throw err;
  }
  if (String(roster.program.id) !== String(id)) notFound();

  const canManage = hasPermission(user, "training.manage");
  const companies = canManage && hasPermission(user, "companies.view") ? (await listCompanyOptions(user)).map((c) => ({ id: c.id, name: c.name })) : [];
  const { batch, program } = roster;
  const dates = `${formatDate(batch.startDate)}${batch.endDate && batch.endDate !== batch.startDate ? ` - ${formatDate(batch.endDate)}` : ""}`;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Programs", href: "/programs" }, { label: program.title, href: `/programs/${program.id}` }, { label: batch.code || `Batch ${batch.id}` }]}
        title={`${program.title} · ${batch.code || `Batch ${batch.id}`}`}
        description={[dates, batch.venue, batch.trainer?.name ? `Trainer: ${batch.trainer.name}` : null].filter(Boolean).join(" · ")}
        actions={<Badge tone={batch.status === "Cancelled" ? "danger" : batch.status === "Completed" ? "success" : "info"}>{batch.status}</Badge>}
      />
      <BatchRoster programId={program.id} batch={batch} registrations={roster.registrations} stats={roster.stats} companies={companies} canManage={canManage} />
    </div>
  );
}
