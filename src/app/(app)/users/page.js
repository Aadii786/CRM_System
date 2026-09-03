import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listUsers, listAssignableRoles } from "@/lib/services/userService";
import { listDepartments } from "@/lib/services/departmentService";
import PageHeader from "@/components/common/PageHeader";
import UsersTable from "@/components/admin/UsersTable";
import NewUserButton from "@/components/admin/NewUserButton";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requireUserWithPermission("users.view");
  const canManage = hasPermission(user, "users.manage");

  const [usersRaw, departmentsRaw, assignableRolesRaw] = await Promise.all([
    listUsers(user),
    listDepartments(),
    canManage ? listAssignableRoles(user) : Promise.resolve([]),
  ]);
  const users = usersRaw.map((u) => u.get({ plain: true }));
  // A department-scoped Department Head only ever sees/manages their own
  // department's team - never the full department catalog (requirements:
  // "Cannot: View another department's users").
  const departments = user.department?.isUniversityWide
    ? departmentsRaw.map((d) => d.get({ plain: true }))
    : departmentsRaw.filter((d) => d.key === user.department?.key).map((d) => d.get({ plain: true }));
  const roles = assignableRolesRaw.map((r) => r.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          user.department?.isUniversityWide
            ? "Every department's team, university-wide - ready to scale past the initial pilot rollout."
            : `${user.department?.name || "Your department"}'s team.`
        }
        actions={canManage && <NewUserButton roles={roles} departments={departments} lockDepartment={!user.department?.isUniversityWide} />}
      />
      <UsersTable users={users} roles={roles} canManage={canManage} />
    </div>
  );
}
