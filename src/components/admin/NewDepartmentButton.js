"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import { createDepartmentAction } from "@/actions/departments";
import { useToast } from "@/components/ui/Toast";

/**
 * Department Creation Flow: name + code, then either pick an existing user
 * as Department Head or create a brand-new one right here. Both paths
 * assign the reusable DEPARTMENT_HEAD role - no per-department role needs
 * to be hand-authored (see constants/roles.js). Super Admin only.
 */
export default function NewDepartmentButton({ existingUsers }) {
  const [open, setOpen] = useState(false);
  const [headMode, setHeadMode] = useState("new");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await createDepartmentAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Department created.");
      setOpen(false);
      formRef.current?.reset();
      setHeadMode("new");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="primary" icon={Building2} onClick={() => setOpen(true)}>New Department</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Department">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <Field label="Department Name" htmlFor="d-name" required>
            <Input id="d-name" name="name" required autoFocus placeholder="e.g. Alumni Relations" />
          </Field>
          <Field label="Department Code" htmlFor="d-key" required hint="Lowercase, used as this department's stable identifier (e.g. alumni-relations).">
            <Input id="d-key" name="key" required placeholder="alumni-relations" />
          </Field>
          <Field label="Description" htmlFor="d-desc">
            <Textarea id="d-desc" name="description" rows={2} />
          </Field>

          <Field label="Department Head" htmlFor="d-head-mode">
            <Select id="d-head-mode" value={headMode} onChange={(e) => setHeadMode(e.target.value)}>
              <option value="new">Create a new Department Head</option>
              <option value="existing">Promote an existing user</option>
              <option value="none">Assign later</option>
            </Select>
            <input type="hidden" name="headMode" value={headMode} />
          </Field>

          {headMode === "new" && (
            <div className="grid sm:grid-cols-2 gap-3 pl-3 border-l-2 border-border">
              <Field label="Head Name" htmlFor="d-head-name" required>
                <Input id="d-head-name" name="newHeadName" required />
              </Field>
              <Field label="Head Email" htmlFor="d-head-email" required>
                <Input id="d-head-email" name="newHeadEmail" type="email" required />
              </Field>
              <Field label="Temporary Password" htmlFor="d-head-pw" hint="Defaults to Demo@12345 if left blank." className="sm:col-span-2">
                <Input id="d-head-pw" name="newHeadPassword" type="password" placeholder="Demo@12345" />
              </Field>
            </div>
          )}

          {headMode === "existing" && (
            <div className="pl-3 border-l-2 border-border">
              <Field label="Select User" htmlFor="d-head-existing" required>
                <Select id="d-head-existing" name="existingHeadUserId" required>
                  <option value="">Choose a user...</option>
                  {existingUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email}){u.Department ? ` - currently ${u.Department.name}` : ""}</option>
                  ))}
                </Select>
              </Field>
              <p className="text-xs text-ink-muted mt-1.5">This user will be moved into the new department and assigned the Department Head role.</p>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Create Department</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
