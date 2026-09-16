import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";

// Role-aware landing page (requirements #69, CNM audit fix): Super Admin
// (holds departments.manage) lands on the system-administration home
// (/departments) rather than the same business-metrics dashboard the
// Director sees - they're both university-wide, but "system
// administration" and "department operations" are meant to stay distinct
// destinations, not the same page. Director/Rector lands on the
// university-wide Executive Dashboard, Marketing users land on the
// Marketing Dashboard, IKL/HSM users land on the IKL/HSM Dashboard, and
// anyone in any other (future) department lands on the generic Department
// Dashboard - so every department gets a dashboard, not just the two
// pilot ones. Nothing here removes access - Super Admin still reaches
// /executive from the sidebar like before, this only changes where they
// land by default.
export default async function DashboardRouterPage() {
  const user = await requireUser();

  if (hasPermission(user, "departments.manage")) redirect("/departments");
  if (hasPermission(user, "executive.dashboard.view")) redirect("/executive");
  if (user.department?.key === "marketing") redirect("/marketing");
  if (user.department?.key === "ikl-hsm") redirect("/ikl-hsm");
  if (user.department && !user.department.isUniversityWide) redirect("/department");

  redirect("/contacts");
}
