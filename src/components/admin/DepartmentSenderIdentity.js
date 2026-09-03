"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X, Power } from "lucide-react";
import Button from "@/components/ui/Button";
import Field, { Input, Select } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import { updateDepartmentSenderIdentityAction, setDepartmentHeadAction, setDepartmentStatusAction } from "@/actions/departments";
import { useToast } from "@/components/ui/Toast";

/**
 * Every department (Marketing, IKL/HSM, and any future department added to
 * the data-driven catalog) sends campaigns from its own identity. Shown
 * per-department in Settings > Departments; sender editable by that
 * department's own manager/executive (campaigns.create + same department)
 * or a Central CRM Administrator; head assignment and activate/deactivate
 * are Super Admin only (departments.manage) - see departmentService.js.
 */
export default function DepartmentSenderIdentity({ department, canEdit, canManageDept, head, departmentUsers = [] }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    senderName: department.senderName || "",
    senderEmail: department.senderEmail || "",
    replyTo: department.replyTo || "",
  });
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("departmentId", department.id);
      fd.set("senderName", form.senderName);
      fd.set("senderEmail", form.senderEmail);
      fd.set("replyTo", form.replyTo);
      const result = await updateDepartmentSenderIdentityAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`Sender identity updated for ${department.name}.`);
      setEditing(false);
      router.refresh();
    });
  }

  function changeHead(headUserId) {
    if (!headUserId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", department.id);
      fd.set("headUserId", headUserId);
      const result = await setDepartmentHeadAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`Department head updated for ${department.name}.`);
      router.refresh();
    });
  }

  function toggleStatus() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", department.id);
      fd.set("isActive", department.isActive ? "false" : "true");
      const result = await setDepartmentStatusAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`${department.name} ${department.isActive ? "deactivated" : "reactivated"}.`);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink">{department.name}</p>
            <Badge tone={department.isUniversityWide ? "primary" : "neutral"}>{department.isUniversityWide ? "University-wide" : "Department"}</Badge>
            {!department.isUniversityWide && <Badge tone={department.isActive ? "success" : "danger"}>{department.isActive ? "Active" : "Inactive"}</Badge>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{department.description}</p>
          <p className="text-xs text-ink-secondary mt-1.5 truncate">
            Sends as: <span className="font-medium text-ink">{department.senderName || "—"}</span>
            {" "}&lt;{department.senderEmail || "not set"}&gt;
          </p>
          <div className="text-xs text-ink-secondary mt-1 flex items-center gap-1.5">
            <span>Head:</span>
            {canManageDept && departmentUsers.length > 0 ? (
              <Select value={head?.id || ""} onChange={(e) => changeHead(e.target.value)} disabled={isPending} className="h-6 text-xs w-44">
                <option value="">Unassigned</option>
                {departmentUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            ) : (
              <span className="font-medium text-ink">{head?.name || "Unassigned"}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canEdit && (
            <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
              Edit sender
            </Button>
          )}
          {canManageDept && !department.isUniversityWide && (
            <Button variant="ghost" size="sm" icon={Power} loading={isPending} onClick={toggleStatus}>
              {department.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 bg-surface-alt">
      <p className="text-sm font-medium text-ink mb-3">{department.name} - campaign sender identity</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Sender Name" htmlFor={`sn-${department.id}`}>
          <Input id={`sn-${department.id}`} value={form.senderName} onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))} />
        </Field>
        <Field label="Sender Email" htmlFor={`se-${department.id}`}>
          <Input id={`se-${department.id}`} type="email" value={form.senderEmail} onChange={(e) => setForm((f) => ({ ...f, senderEmail: e.target.value }))} />
        </Field>
        <Field label="Reply-To" htmlFor={`rt-${department.id}`}>
          <Input id={`rt-${department.id}`} type="email" value={form.replyTo} onChange={(e) => setForm((f) => ({ ...f, replyTo: e.target.value }))} />
        </Field>
      </div>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <Button variant="primary" size="sm" icon={Save} loading={isPending} onClick={save}>Save</Button>
        <Button variant="ghost" size="sm" icon={X} onClick={() => setEditing(false)} disabled={isPending}>Cancel</Button>
      </div>
    </div>
  );
}
