"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, ListChecks } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import { setContactListsAction } from "@/actions/contacts";
import { useToast } from "@/components/ui/Toast";

/** Contact detail's Lists tab: shows every List this contact belongs to, and an "+ Add to List" picker. */
export default function ContactListsPanel({ contactId, memberLists, allLists, canManage }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink">Lists</h3>
        {canManage && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setOpen(true)}>Add to List</Button>}
      </div>

      {memberLists.length === 0 ? (
        <EmptyState icon={ListChecks} title="Not on any lists yet" description="Add this contact to a List to include them in targeted sends." />
      ) : (
        <ul className="flex flex-col gap-2">
          {memberLists.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
              <Link href={`/lists/${l.id}`} className="text-sm font-medium text-primary hover:underline">✓ {l.name}</Link>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <AddToListModal
          contactId={contactId}
          allLists={allLists}
          currentIds={memberLists.map((l) => l.id)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function AddToListModal({ contactId, allLists, currentIds, onClose }) {
  const [selected, setSelected] = useState(new Set(currentIds.map(String)));
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

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
      fd.set("contactId", contactId);
      selected.forEach((id) => fd.append("listIds", id));
      const result = await setContactListsAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push("Lists updated.");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add to List"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isPending} onClick={save}>Save</Button>
        </>
      }
    >
      {allLists.length === 0 ? (
        <EmptyState icon={X} title="No lists yet" description="Create a list first from the Lists page." />
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {allLists.map((l) => (
            <Checkbox
              key={l.id}
              label={l.folder?.name ? `${l.name} (${l.folder.name})` : l.name}
              checked={selected.has(String(l.id))}
              onChange={() => toggle(l.id)}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
