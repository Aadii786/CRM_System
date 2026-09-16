import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listDepartments } from "@/lib/services/departmentService";
import { listUsers } from "@/lib/services/userService";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import DepartmentSenderIdentity from "@/components/admin/DepartmentSenderIdentity";
import NewDepartmentButton from "@/components/admin/NewDepartmentButton";

export const metadata = { title: "Departments" };

/**
 * Super Admin -> Departments -> Department Head -> Team Member, front and
 * center in its own nav item (Administration section) rather than buried
 * inside Settings - a department's own manager reaches this without
 * needing full settings.view.
 */
export default async function DepartmentsPage() {
  const user = await requireUser();
  const canManageDepts = hasPermission(user, "departments.manage");
  const canViewPage = canManageDepts || hasPermission(user, "campaigns.create");
  if (!canViewPage) redirect("/403");

  const [departmentsRaw, allUsersRaw] = await Promise.all([
    listDepartments(),
    canManageDepts ? listUsers(user) : Promise.resolve([]),
  ]);
  // CNM audit fix: a department-scoped viewer (e.g. Marketing, who reaches
  // this page only to edit their own department's sender identity) used to
  // see every department's name and description here, not just their own -
  // no data or destructive action was exposed, but it blurred the
  // Super-Admin-only boundary this page is otherwise meant to have.
  const departments = (canManageDepts ? departmentsRaw : departmentsRaw.filter((d) => d.key === user.department?.key)).map((d) => d.get({ plain: true }));
  const allUsers = allUsersRaw.map((u) => u.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Departments"
        description={
          canManageDepts
            ? "Unlimited departments, each with its own head, team and campaign sender identity."
            : "Your department's head, team and campaign sender identity."
        }
        actions={canManageDepts && <NewDepartmentButton existingUsers={allUsers} />}
      />
      <Card padding="none">
        <div className="divide-y divide-border">
          {departments.map((d) => {
            const sameOrUniversityWide = user.department?.isUniversityWide || user.department?.key === d.key;
            const canEditSender = canManageDepts || (hasPermission(user, "campaigns.create") && sameOrUniversityWide);
            const head = allUsers.find((u) => u.id === d.headUserId) || null;
            const departmentUsers = allUsers.filter((u) => u.departmentId === d.id);
            return (
              <DepartmentSenderIdentity
                key={d.id}
                department={d}
                canEdit={canEditSender}
                canManageDept={canManageDepts}
                head={head}
                departmentUsers={departmentUsers}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}
