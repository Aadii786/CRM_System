"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input } from "@/components/ui/Field";
import { updateUserDetailsAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

/** The "Update" in CRUD - name/email/job title. Role and department/status changes stay in their own dedicated controls. */
export default function EditUserButton({ user }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, jobTitle: user.jobTitle || "" });
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", user.id);
      fd.set("name", form.name);
      fd.set("email", form.email);
      fd.set("jobTitle", form.jobTitle);
      const result = await updateUserDetailsAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`${form.name} updated.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Edit user"
        className="p-1.5 rounded text-ink-muted hover:text-ink hover:bg-surface-alt"
      >
        <Pencil className="size-3.5" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit User">
        <div className="flex flex-col gap-4">
          <Field label="Full Name" htmlFor={`eu-name-${user.id}`} required>
            <Input id={`eu-name-${user.id}`} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <Field label="Email" htmlFor={`eu-email-${user.id}`} required>
            <Input id={`eu-email-${user.id}`} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Job Title" htmlFor={`eu-title-${user.id}`}>
            <Input id={`eu-title-${user.id}`} value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="primary" loading={isPending} onClick={save}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
