"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw, Pencil } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { toggleUserStatusAction, updateUserRolesAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";
import { formatDate, timeAgo } from "@/lib/utils/format";
import EditUserButton from "@/components/admin/EditUserButton";

export default function UsersTable({ users, roles, canManage }) {
  const [isPending, startTransition] = useTransition();
  const [managing, setManaging] = useState(null);
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

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Name</th>
            <th className="px-4 py-2.5 text-left font-medium">Role(s)</th>
            <th className="px-4 py-2.5 text-left font-medium">Department</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Last Active</th>
            <th className="px-4 py-2.5 text-left font-medium">Created</th>
            {canManage && <th className="px-4 py-2.5 text-left font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => {
            const userRoles = u.Roles?.length ? u.Roles : [{ key: u.primaryRoleKey, name: roles.find((r) => r.key === u.primaryRoleKey)?.name || u.primaryRoleKey }];
            return (
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    {userRoles.map((r) => (
                      <span key={r.key} className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-xs text-ink-secondary">
                        {r.name}
                      </span>
                    ))}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setManaging(u)}
                        title="Manage roles"
                        className="p-1 rounded text-ink-muted hover:text-primary hover:bg-surface-alt"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.Department ? <Badge department={u.Department.key}>{u.Department.name}</Badge> : <span className="text-ink-muted">—</span>}
                </td>
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
            );
          })}
        </tbody>
      </table>

      {canManage && (
        <ManageRolesModal
          user={managing}
          roles={roles}
          onClose={() => setManaging(null)}
        />
      )}
    </div>
  );
}

function ManageRolesModal({ user, roles, onClose }) {
  const [selected, setSelected] = useState([]);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  // Reset the checked set whenever a different user is opened.
  const openUserId = user?.id;
  const [lastOpenId, setLastOpenId] = useState(null);
  if (user && openUserId !== lastOpenId) {
    setLastOpenId(openUserId);
    setSelected((user.Roles?.length ? user.Roles.map((r) => r.key) : [user.primaryRoleKey]).filter(Boolean));
  }

  function toggle(key) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function save() {
    if (!selected.length) {
      push("Select at least one role.", { type: "error" });
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", user.id);
      for (const key of selected) fd.append("roleKeys", key);
      const result = await updateUserRolesAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`Role(s) updated for ${user.name}.`);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title={user ? `Manage roles - ${user.name}` : "Manage roles"}
      description="A person can hold more than one role at once - e.g. both Marketing and Sales in the same department."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" loading={isPending} onClick={save}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {roles.map((r) => (
          <label key={r.key} className="flex items-start gap-2.5 rounded-md border border-border p-2.5 cursor-pointer hover:bg-surface-alt">
            <input
              type="checkbox"
              checked={selected.includes(r.key)}
              onChange={() => toggle(r.key)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-ink">{r.name}</span>
              {r.description && <span className="block text-xs text-ink-muted mt-0.5">{r.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
