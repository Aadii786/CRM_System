"use client";

import { useRef, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select } from "@/components/ui/Field";
import { createUserAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function NewUserButton({ roles, departments }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();

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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" htmlFor="u-role" required>
              <Select id="u-role" name="roleKey" required>
                {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Department" htmlFor="u-dept">
              <Select id="u-dept" name="departmentId">
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>
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
