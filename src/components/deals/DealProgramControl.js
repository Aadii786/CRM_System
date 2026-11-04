"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ProgramSelect from "@/components/deals/ProgramSelect";
import { setDealProgramAction } from "@/actions/deals";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

/** Shows which catalogue program / batch the inquiry is about, and lets the owner change it. */
export default function DealProgramControl({ dealId, program, batch, programs, canEdit }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save(formData) {
    startTransition(async () => {
      const result = await setDealProgramAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      push("Inquiry linked.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm gap-3">
      <span className="text-ink-muted inline-flex items-center gap-1.5"><GraduationCap className="size-3.5" /> Program</span>
      <span className="flex items-center gap-2 text-right">
        <span className="font-medium text-ink">
          {program ? <Link href={`/programs/${program.id}`} className="hover:text-primary">{program.title}</Link> : "—"}
          {batch && <span className="text-xs text-ink-muted font-normal"> · {batch.code || `Batch ${batch.id}`} ({formatDate(batch.startDate)})</span>}
        </span>
        {canEdit && (
          <button type="button" title="Change program" onClick={() => { setError(null); setOpen(true); }} className="p-1 rounded text-ink-muted hover:text-primary hover:bg-surface-alt">
            <Pencil className="size-3.5" />
          </button>
        )}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title="Link to a program" description="Which catalogue program (and batch) is this inquiry about?">
        {open && (
          <form action={save} className="flex flex-col gap-4">
            <input type="hidden" name="dealId" value={dealId} />
            <ProgramSelect programs={programs} defaultProgramId={program?.id || ""} defaultBatchId={batch?.id || ""} idPrefix="dealpg" />
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
