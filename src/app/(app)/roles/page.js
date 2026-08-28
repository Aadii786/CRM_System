import { requireUserWithPermission } from "@/lib/auth/requireUser";
import { hasPermission } from "@/lib/permissions/rbac";
import { listRolesWithPermissions, listAllPermissions } from "@/lib/services/roleService";
import PageHeader from "@/components/common/PageHeader";
import PermissionMatrix from "@/components/admin/PermissionMatrix";

export const metadata = { title: "Roles & Permissions" };

export default async function RolesPage() {
  const user = await requireUserWithPermission("roles.view");
  const [rolesRaw, permissionsRaw] = await Promise.all([listRolesWithPermissions(user), listAllPermissions(user)]);
  const roles = rolesRaw.map((r) => r.get({ plain: true }));
  const permissions = permissionsRaw.map((p) => p.get({ plain: true }));

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="The centralized permission matrix (requirements #44). Central CRM Administrator always retains full access."
      />
      <PermissionMatrix roles={roles} permissions={permissions} canManage={hasPermission(user, "roles.manage")} />
    </div>
  );
}
