"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import { createTaskAction } from "@/actions/tasks";
import { useToast } from "@/components/ui/Toast";

export default function NewTaskButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await createTaskAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Task created.");
      setOpen(false);
      formRef.current?.reset();
      // See TasksList.js for why this is necessary: revalidatePath() alone
      // doesn't refresh an already-mounted page when the action was called
      // imperatively rather than via a native form-action binding.
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New Task</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Task">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <Field label="Title" htmlFor="t-title" required>
            <Input id="t-title" name="title" required autoFocus />
          </Field>
          <Field label="Description" htmlFor="t-desc">
            <Textarea id="t-desc" name="description" rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date" htmlFor="t-due">
              <Input id="t-due" name="dueDate" type="date" />
            </Field>
            <Field label="Priority" htmlFor="t-priority">
              <Select id="t-priority" name="priority" defaultValue="Medium">
                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Create Task</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
