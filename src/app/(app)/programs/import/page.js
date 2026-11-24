import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { requirePermission } from "@/lib/permissions/rbac";
import PageHeader from "@/components/common/PageHeader";
import ProgramDataImport from "@/components/programs/ProgramDataImport";

export const metadata = { title: "Import program data" };

export default async function ImportProgramDataPage() {
  const user = await requireUserWithPermission("training.manage");
  requirePermission(user, "contacts.import");
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Programs", href: "/programs" }, { label: "Import program data" }]}
        title="Import program data"
        description="One-time move of IKL's Excel data: programs, batches, participants, registrations (attendance, payment, completion, certificate, feedback) and past history."
      />
      <ProgramDataImport />
    </div>
  );
}
