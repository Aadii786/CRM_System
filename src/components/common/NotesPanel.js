"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Field";
import { addNoteAction, deleteNoteAction } from "@/actions/notes";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/utils/format";

/**
 * Free-text notes on a contact, company or deal: write one, read the others
 * (newest first, with who wrote them and when). Notes are searchable from
 * the global search box.
 */
export default function NotesPanel({ relatedType, relatedId, notes, canAdd }) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function save(formData) {
    startTransition(async () => {
      const result = await addNoteAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Note saved.");
      formRef.current?.reset();
      router.refresh();
    });
  }

  function remove(id) {
    if (!window.confirm("Delete this note?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("relatedType", relatedType);
      fd.set("relatedId", relatedId);
      const result = await deleteNoteAction(fd);
      if (result?.error) push(result.error, { type: "error" });
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canAdd && (
        <form ref={formRef} action={save} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
          <input type="hidden" name="relatedType" value={relatedType} />
          <input type="hidden" name="relatedId" value={relatedId} />
          <label htmlFor={`note-${relatedType}-${relatedId}`} className="text-sm font-medium text-ink">Add a note</label>
          <Textarea id={`note-${relatedType}-${relatedId}`} name="body" rows={3} maxLength={5000} placeholder="What happened, what was agreed, what to remember..." required />
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" icon={StickyNote} loading={isPending}>Save note</Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description={canAdd ? "Notes you add here appear on the record and in search." : undefined} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm text-ink whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-ink-muted">{n.author?.name || "Unknown"} · {formatDateTime(n.createdAt)}</p>
                {canAdd && (
                  <button type="button" onClick={() => remove(n.id)} disabled={isPending} title="Delete note" className="p-1 rounded text-ink-muted hover:text-danger hover:bg-surface-alt">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
