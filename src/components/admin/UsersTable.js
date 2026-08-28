"use client";

import { useTransition } from "react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { toggleUserStatusAction, updateUserRoleAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";
import { formatDate, timeAgo } from "@/lib/utils/format";

export default function UsersTable({ users, roles, canManage }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  function toggleStatus(u) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", u.id);
      fd.set("status", u.status === "active" ? "disabled" : "active");
      await toggleUserStatusAction(fd);
      push(`${u.name} ${u.status === "active" ? "disabled" : "enabled"}.`);
    });
  }

  function changeRole(u, roleKey) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", u.id);
      fd.set("roleKey", roleKey);
      await updateUserRoleAction(fd);
      push(`Role updated for ${u.name}.`);
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Name</th>
            <th className="px-4 py-2.5 text-left font-medium">Role</th>
            <th className="px-4 py-2.5 text-left font-medium">Department</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Last Active</th>
            <th className="px-4 py-2.5 text-left font-medium">Created</th>
            {canManage && <th className="px-4 py-2.5 text-left font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="bg-surface">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} color={u.avatarColor} size="sm" />
                  <div>
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-ink-muted">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {canManage ? (
                  <Select value={u.primaryRoleKey || ""} onChange={(e) => changeRole(u, e.target.value)} disabled={isPending} className="h-8 text-xs w-52">
                    {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                  </Select>
                ) : (
                  <span className="text-ink-secondary">{roles.find((r) => r.key === u.primaryRoleKey)?.name}</span>
                )}
              </td>
              <td className="px-4 py-3 text-ink-secondary">{u.Department?.name || "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status}</Badge>
              </td>
              <td className="px-4 py-3 text-ink-secondary">{timeAgo(u.lastActiveAt)}</td>
              <td className="px-4 py-3 text-ink-secondary">{formatDate(u.createdAt)}</td>
              {canManage && (
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(u)}
                    disabled={isPending}
                    className="text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    {u.status === "active" ? "Disable" : "Enable"}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
