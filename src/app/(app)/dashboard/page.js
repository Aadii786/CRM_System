import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";

// Role-aware landing page (requirements #69): the Rector/Admin land on the
// university-wide Executive Dashboard, Marketing users land on the
// Marketing Dashboard, IKL/HSM users land on the IKL/HSM Dashboard, and
// anyone in any other (future) department lands on the generic Department
// Dashboard - so every department gets a dashboard, not just the two
// pilot ones.
export default async function DashboardRouterPage() {
  const user = await requireUser();

  if (hasPermission(user, "executive.dashboard.view")) redirect("/executive");
  if (user.department?.key === "marketing") redirect("/marketing");
  if (user.department?.key === "ikl-hsm") redirect("/ikl-hsm");
  if (user.department && !user.department.isUniversityWide) redirect("/department");

  redirect("/contacts");
}
