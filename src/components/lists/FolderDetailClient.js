"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, Copy, ArrowRightLeft, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { createListAction, updateListAction, deleteListAction, duplicateListAction, moveListAction } from "@/actions/lists";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

export default function FolderDetailClient({ folder, lists, otherFolders, canManage, canDelete }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [movingList, setMovingList] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function runAction(action, fd, successMsg) {
    startTransition(async () => {
      const result = await action(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(successMsg);
      router.refresh();
    });
  }

  function handleDuplicate(list) {
    const fd = new FormData();
    fd.set("id", list.id);
    runAction(duplicateListAction, fd, `Duplicated "${list.name}".`);
  }

  function handleDelete(list) {
    if (!window.confirm(`Delete the list "${list.name}"? Contacts in it are not deleted.`)) return;
    const fd = new FormData();
    fd.set("id", list.id);
    runAction(deleteListAction, fd, `List "${list.name}" deleted.`);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        {canManage && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New List</Button>}
      </div>

      {lists.length === 0 ? (
        <EmptyState
          title="No lists in this folder yet"
          description="Create a list to start grouping contacts here."
          action={canManage && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New List</Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "List", render: (l) => <Link href={`/lists/${l.id}`} className="font-medium text-primary hover:underline">{l.name}</Link> },
            { key: "description", header: "Description", render: (l) => <span className="text-ink-secondary">{l.description || "—"}</span> },
            { key: "contactCount", header: "Contacts", render: (l) => l.contactCount.toLocaleString() },
            { key: "createdAt", header: "Created", render: (l) => formatDate(l.createdAt) },
            { key: "status", header: "Status", render: (l) => <span className="text-ink-secondary">{l.status || "Active"}</span> },
            ...(canManage
              ? [{
                  key: "actions",
                  header: "",
                  className: "text-right whitespace-nowrap",
                  render: (l) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditingList(l)}>Rename</Button>
                      <Button variant="ghost" size="sm" icon={Copy} onClick={() => handleDuplicate(l)} loading={isPending}>Duplicate</Button>
                      <Button variant="ghost" size="sm" icon={ArrowRightLeft} onClick={() => setMovingList(l)}>Move</Button>
                      <Button variant="ghost" size="sm" icon={Download} href={`/api/lists/${l.id}/export`}>Export</Button>
                      {canDelete && <Button variant="danger-ghost" size="sm" icon={Trash2} onClick={() => handleDelete(l)} loading={isPending}>Delete</Button>}
                    </div>
                  ),
                }]
              : []),
          ]}
          rows={lists}
        />
      )}

      <CreateListModal open={createOpen} onClose={() => setCreateOpen(false)} folderId={folder.id} />
      {editingList && <EditListModal list={editingList} onClose={() => setEditingList(null)} />}
      {movingList && <MoveListModal list={movingList} otherFolders={otherFolders} onClose={() => setMovingList(null)} />}
    </div>
  );
}

function CreateListModal({ open, onClose, folderId }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("description", description);
      fd.set("folderId", folderId);
      const result = await createListAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`List "${name}" created.`);
      setName("");
      setDescription("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New List">
      <div className="flex flex-col gap-4">
        <Field label="List Name" htmlFor="cl-name" required>
          <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Software Developers" autoFocus />
        </Field>
        <Field label="Description" htmlFor="cl-desc">
          <Textarea id="cl-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. All software development professionals from technology companies." />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" loading={isPending} onClick={save}>Create List</Button>
        </div>
      </div>
    </Modal>
  );
}

function EditListModal({ list, onClose }) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || "");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", list.id);
      fd.set("name", name);
      fd.set("description", description);
      const result = await updateListAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push("List updated.");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open onClose={onClose} title="Rename List">
      <div className="flex flex-col gap-4">
        <Field label="List Name" htmlFor="el-name" required>
          <Input id="el-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Description" htmlFor="el-desc">
          <Textarea id="el-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" loading={isPending} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function MoveListModal({ list, otherFolders, onClose }) {
  const [folderId, setFolderId] = useState(otherFolders[0]?.id ? String(otherFolders[0].id) : "");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    if (!folderId) {
      setError("Choose a destination folder.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", list.id);
      fd.set("folderId", folderId);
      const result = await moveListAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`Moved "${list.name}".`);
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open onClose={onClose} title={`Move "${list.name}"`}>
      <div className="flex flex-col gap-4">
        <Field label="Destination Folder" htmlFor="mv-folder" required>
          <Select id="mv-folder" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            {otherFolders.length === 0 && <option value="">No other folders available</option>}
            {otherFolders.map((f) => <option key={f.id} value={String(f.id)}>{f.name}{f.Company ? ` (${f.Company.name})` : ""}</option>)}
          </Select>
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" loading={isPending} onClick={save}>Move</Button>
        </div>
      </div>
    </Modal>
  );
}
