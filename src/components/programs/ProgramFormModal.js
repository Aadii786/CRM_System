"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { createProgramAction, updateProgramAction } from "@/actions/programs";
import { useToast } from "@/components/ui/Toast";
import { PROGRAM_CATEGORIES, PROGRAM_TYPES } from "@/lib/constants/programs";

/** Create or edit a catalogue program. Pass `program` to edit. */
export default function ProgramFormModal({ program }) {
  const isEdit = Boolean(program);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function submit(formData) {
    startTransition(async () => {
      const result = await (isEdit ? updateProgramAction : createProgramAction)(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setOpen(false);
      push(isEdit ? "Program updated." : "Program added to the catalogue.");
      if (!isEdit && result.id) router.push(`/programs/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <>
      {isEdit ? (
        <Button variant="secondary" icon={Pencil} onClick={() => { setError(null); setOpen(true); }}>Edit</Button>
      ) : (
        <Button variant="primary" icon={Plus} onClick={() => { setError(null); setOpen(true); }}>New program</Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={isEdit ? "Edit program" : "New program"} description="A catalogue item that can run repeatedly as dated batches." size="lg">
        {open && (
          <form action={submit} className="flex flex-col gap-4">
            {isEdit && <input type="hidden" name="id" value={program.id} />}
            <div className="grid sm:grid-cols-[1fr_160px] gap-3">
              <Field label="Title" htmlFor="pg-title" required>
                <Input id="pg-title" name="title" defaultValue={program?.title || ""} required autoFocus />
              </Field>
              <Field label="Code" htmlFor="pg-code" hint="Optional, unique">
                <Input id="pg-code" name="code" defaultValue={program?.code || ""} maxLength={40} />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Category" htmlFor="pg-category">
                <Select id="pg-category" name="category" defaultValue={program?.category || ""}>
                  <option value="">Not set</option>
                  {PROGRAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Type" htmlFor="pg-type">
                <Select id="pg-type" name="programType" defaultValue={program?.programType || "Open enrollment"}>
                  {PROGRAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Duration (days)" htmlFor="pg-days">
                <Input id="pg-days" name="durationDays" type="number" min="1" defaultValue={program?.durationDays ?? ""} />
              </Field>
              <Field label="Duration note" htmlFor="pg-dtext" hint="e.g. 2 days, 9am to 5pm">
                <Input id="pg-dtext" name="durationText" defaultValue={program?.durationText || ""} maxLength={100} />
              </Field>
              <Field label="Standard fee (PKR)" htmlFor="pg-fee">
                <Input id="pg-fee" name="defaultFee" type="number" min="0" step="500" defaultValue={program?.defaultFee ?? ""} />
              </Field>
            </div>
            <Field label="Description" htmlFor="pg-desc">
              <Textarea id="pg-desc" name="description" rows={3} defaultValue={program?.description || ""} />
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>{isEdit ? "Save changes" : "Add program"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
