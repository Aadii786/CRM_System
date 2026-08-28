"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Textarea } from "@/components/ui/Field";
import { createMeetingAction } from "@/actions/meetings";
import { useToast } from "@/components/ui/Toast";

export default function NewMeetingButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await createMeetingAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Meeting scheduled.");
      setOpen(false);
      formRef.current?.reset();
    });
  }

  return (
    <>
      <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New Meeting</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Meeting">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          <Field label="Title" htmlFor="m-title" required>
            <Input id="m-title" name="title" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor="m-start" required>
              <Input id="m-start" name="startAt" type="datetime-local" required />
            </Field>
            <Field label="End" htmlFor="m-end">
              <Input id="m-end" name="endAt" type="datetime-local" />
            </Field>
          </div>
          <Field label="Location" htmlFor="m-location">
            <Input id="m-location" name="location" placeholder="Zoom, office address, etc." />
          </Field>
          <Field label="Notes" htmlFor="m-notes">
            <Textarea id="m-notes" name="notes" rows={3} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Schedule</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
