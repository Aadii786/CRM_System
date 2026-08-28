import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listUsers } from "@/lib/services/userService";
import { ROLES } from "@/lib/constants/roles";
import { listDepartments } from "@/lib/services/departmentService";
import PageHeader from "@/components/common/PageHeader";
import UsersTable from "@/components/admin/UsersTable";
import NewUserButton from "@/components/admin/NewUserButton";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requireUserWithPermission("users.view");
  const [usersRaw, departmentsRaw] = await Promise.all([listUsers(user), listDepartments()]);
  const users = usersRaw.map((u) => u.get({ plain: true }));
  const departments = departmentsRaw.map((d) => d.get({ plain: true }));
  const canManage = hasPermission(user, "users.manage");

  return (
    <div>
      <PageHeader
        title="Users"
        description="The six-user pilot structure (Rector, Central Administrator, Marketing x2, IKL/HSM x2), ready to scale to a full university rollout."
        actions={canManage && <NewUserButton roles={ROLES} departments={departments} />}
      />
      <UsersTable users={users} roles={ROLES} canManage={canManage} />
    </div>
  );
}
