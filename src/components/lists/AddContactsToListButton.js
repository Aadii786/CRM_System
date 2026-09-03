"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { searchContactsForListAction, addContactsToListAction } from "@/actions/lists";
import { useToast } from "@/components/ui/Toast";

/** "Manage Contacts" on a List - search existing contacts and add them directly, without going through the contact form. */
export default function AddContactsToListButton({ listId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      searchContactsForListAction(query).then(setResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  function toggle(id) {
    const key = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listId", listId);
      selected.forEach((id) => fd.append("contactIds", id));
      const result = await addContactsToListAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`Added ${result.added} contact(s) to the list.`);
      setSelected(new Set());
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" icon={UserPlus} onClick={() => setOpen(true)}>Add Contacts</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Contacts to List"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={isPending} disabled={selected.size === 0} onClick={save}>
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </>
        }
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts by name or email..." autoFocus />
        <div className="mt-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
          {results.length === 0 && <p className="text-sm text-ink-muted px-1 py-3">Type to search contacts.</p>}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left hover:bg-surface-alt"
            >
              <span>
                <span className="text-sm font-medium text-ink">{c.name}</span>
                <span className="text-xs text-ink-muted ml-2">{c.email}</span>
              </span>
              {selected.has(String(c.id)) && <Check className="size-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
