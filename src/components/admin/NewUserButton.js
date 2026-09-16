"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select } from "@/components/ui/Field";
import { createUserAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function NewUserButton({ roles, departments, lockDepartment = false }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await createUserAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("User created.");
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="primary" icon={UserPlus} onClick={() => setOpen(true)}>Add User</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add User">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <Field label="Full Name" htmlFor="u-name" required>
            <Input id="u-name" name="name" required autoFocus />
          </Field>
          <Field label="Email" htmlFor="u-email" required>
            <Input id="u-email" name="email" type="email" required />
          </Field>
          <Field label="Job Title" htmlFor="u-title">
            <Input id="u-title" name="jobTitle" />
          </Field>
          <Field label="Role(s)" htmlFor="u-role" required hint="A person can hold more than one role - e.g. both Marketing and Sales.">
            <div id="u-role" className="flex flex-col gap-1.5">
              {roles.map((r) => (
                <label key={r.key} className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="roleKeys" value={r.key} />
                  {r.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Department" htmlFor="u-dept" hint={lockDepartment ? "Locked to your own department." : undefined}>
            {lockDepartment ? (
              <>
                <Input value={departments[0]?.name || ""} disabled />
                <input type="hidden" name="departmentId" value={departments[0]?.id || ""} />
              </>
            ) : (
              <Select id="u-dept" name="departmentId">
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Temporary Password" htmlFor="u-password" hint="Defaults to Demo@12345 if left blank.">
            <Input id="u-password" name="password" type="password" placeholder="Demo@12345" />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Create User</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
