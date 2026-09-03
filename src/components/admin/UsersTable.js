"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { toggleUserStatusAction, updateUserRoleAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";
import { formatDate, timeAgo } from "@/lib/utils/format";
import EditUserButton from "@/components/admin/EditUserButton";

export default function UsersTable({ users, roles, canManage }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function toggleStatus(u) {
    const deleting = u.status === "active";
    if (deleting && !window.confirm(`Delete ${u.name}? This revokes their login access immediately - their records stay intact and this can be undone from here.`)) {
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", u.id);
      fd.set("status", deleting ? "disabled" : "active");
      const result = await toggleUserStatusAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`${u.name} ${deleting ? "deleted" : "restored"}.`);
      router.refresh();
    });
  }

  function changeRole(u, roleKey) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", u.id);
      fd.set("roleKey", roleKey);
      const result = await updateUserRoleAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`Role updated for ${u.name}.`);
      router.refresh();
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
                <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "active" : "deleted"}</Badge>
              </td>
              <td className="px-4 py-3 text-ink-secondary">{timeAgo(u.lastActiveAt)}</td>
              <td className="px-4 py-3 text-ink-secondary">{formatDate(u.createdAt)}</td>
              {canManage && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EditUserButton user={u} />
                    <button
                      onClick={() => toggleStatus(u)}
                      disabled={isPending}
                      title={u.status === "active" ? "Delete user" : "Restore user"}
                      className={[
                        "p-1.5 rounded hover:bg-surface-alt",
                        u.status === "active" ? "text-ink-muted hover:text-danger" : "text-ink-muted hover:text-success",
                      ].join(" ")}
                    >
                      {u.status === "active" ? <Trash2 className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
