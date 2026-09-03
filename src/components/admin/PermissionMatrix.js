"use client";

import { Fragment, useState, useTransition } from "react";
import { Check, X, Lock } from "lucide-react";
import { toggleRolePermissionAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function PermissionMatrix({ roles, permissions, canManage }) {
  const [matrix, setMatrix] = useState(() => {
    const m = {};
    for (const role of roles) {
      m[role.id] = new Set(role.Permissions.map((p) => p.id));
    }
    return m;
  });
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  const modules = [...new Set(permissions.map((p) => p.module))];

  function toggle(role, perm) {
    if (!canManage) return;
    if (role.key === "CENTRAL_CRM_ADMINISTRATOR") return;
    const enabled = !matrix[role.id].has(perm.id);

    setMatrix((prev) => {
      const next = { ...prev, [role.id]: new Set(prev[role.id]) };
      if (enabled) next[role.id].add(perm.id);
      else next[role.id].delete(perm.id);
      return next;
    });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("roleId", role.id);
      fd.set("permissionId", perm.id);
      fd.set("enabled", String(enabled));
      const result = await toggleRolePermissionAction(fd);
      if (result?.error) {
        // Revert the optimistic toggle above - the server rejected it.
        setMatrix((prev) => {
          const next = { ...prev, [role.id]: new Set(prev[role.id]) };
          if (enabled) next[role.id].delete(perm.id);
          else next[role.id].add(perm.id);
          return next;
        });
        push(result.error, { type: "error" });
        return;
      }
      push(`${enabled ? "Granted" : "Revoked"} ${perm.key} for ${role.name}.`);
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-surface-alt text-xs uppercase tracking-wide text-ink-muted sticky top-0">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium sticky left-0 bg-surface-alt">Permission</th>
            {roles.map((r) => (
              <th key={r.id} className="px-3 py-2.5 text-center font-medium whitespace-nowrap">
                {r.name}
                {r.key === "CENTRAL_CRM_ADMINISTRATOR" && (
                  <Lock className="size-3 inline-block ml-1 text-ink-muted align-[-1px]" title="Always retains full access - not editable, so it can never be locked out of managing every other role" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {modules.map((mod) => (
            <Fragment key={mod}>
              <tr className="bg-surface-alt/60">
                <td colSpan={roles.length + 1} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted sticky left-0">{mod}</td>
              </tr>
              {permissions.filter((p) => p.module === mod).map((perm) => (
                <tr key={perm.id} className="bg-surface">
                  <td className="px-4 py-2 text-ink-secondary sticky left-0 bg-surface">{perm.key}</td>
                  {roles.map((role) => {
                    const has = matrix[role.id]?.has(perm.id);
                    const locked = role.key === "CENTRAL_CRM_ADMINISTRATOR";
                    return (
                      <td key={role.id} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={!canManage || locked || isPending}
                          onClick={() => toggle(role, perm)}
                          aria-label={`${has ? "Revoke" : "Grant"} ${perm.key} for ${role.name}`}
                          className={[
                            "inline-flex size-6 items-center justify-center rounded-md transition-colors",
                            has ? "bg-success-subtle text-success" : "bg-surface-alt text-ink-muted",
                            canManage && !locked ? "hover:opacity-75 cursor-pointer" : "cursor-default",
                          ].join(" ")}
                        >
                          {has ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
