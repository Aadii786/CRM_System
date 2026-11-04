import { notFound } from "next/navigation";
import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { getProgramById, listTrainers } from "@/lib/services/programService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import ProgramFormModal from "@/components/programs/ProgramFormModal";
import ProgramStatusButton from "@/components/programs/ProgramStatusButton";
import BatchesPanel from "@/components/programs/BatchesPanel";
import { CalendarDays, Users, Handshake } from "lucide-react";
import { formatCurrencyFull } from "@/lib/utils/format";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Program ${id}` };
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-ink-muted shrink-0">{label}</span>
      <span className="font-medium text-ink text-right">{children || "—"}</span>
    </div>
  );
}

export default async function ProgramDetailPage({ params }) {
  const user = await requireUserWithPermission("programs.view");
  const { id } = await params;
  const result = await getProgramById(user, id);
  if (!result) notFound();

  const program = result.program.get({ plain: true });
  const batches = program.batches || [];
  const canManage = hasPermission(user, "training.manage");
  const trainers = canManage ? await listTrainers(user) : [];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Programs", href: "/programs" }, { label: program.title }]}
        title={program.title}
        description={[program.code, program.category].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <Badge tone={program.status === "Active" ? "success" : "neutral"}>{program.status}</Badge>
            {canManage && <ProgramFormModal program={program} />}
            {canManage && <ProgramStatusButton program={program} />}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <MetricCard label="Batches" value={batches.length} icon={CalendarDays} tone="blue" />
        <MetricCard label="Interested leads" value={result.interestedCount} icon={Users} tone="purple" />
        <MetricCard label="Linked inquiries" value={result.dealCount} icon={Handshake} tone="cyan" />
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6 items-start">
        <Card>
          <h3 className="text-sm font-semibold text-ink mb-2">About this program</h3>
          <Row label="Type">{program.programType}</Row>
          <Row label="Category">{program.category}</Row>
          <Row label="Duration">{program.durationText || (program.durationDays ? `${program.durationDays} day(s)` : null)}</Row>
          <Row label="Standard fee">{Number(program.defaultFee) ? formatCurrencyFull(program.defaultFee) : null}</Row>
          {program.description && <p className="mt-3 text-sm text-ink-secondary whitespace-pre-wrap">{program.description}</p>}
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-ink mb-2.5">Batches</h3>
          <BatchesPanel programId={program.id} defaultFee={program.defaultFee} batches={batches} trainers={trainers} canManage={canManage && program.status === "Active"} />
        </div>
      </div>
    </div>
  );
}
