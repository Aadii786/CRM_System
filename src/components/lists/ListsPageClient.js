"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FolderPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Drawer from "@/components/ui/Drawer";
import Field, { Input, Select } from "@/components/ui/Field";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { createFolderAction, createListAction, deleteListAction } from "@/actions/lists";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

const NEW_FOLDER_VALUE = "__new__";

export default function ListsPageClient({ folders, lists, canManage, canDelete }) {
  const [folderFilter, setFolderFilter] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const visibleLists = useMemo(
    () => (folderFilter === "all" ? lists : lists.filter((l) => String(l.folderId) === folderFilter)),
    [lists, folderFilter]
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <Select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="w-auto min-w-[220px]">
          <option value="all">All folders ({lists.length} lists)</option>
          {folders.map((f) => (
            <option key={f.id} value={String(f.id)}>
              {f.name} ({lists.filter((l) => l.folderId === f.id).length})
            </option>
          ))}
        </Select>
        {canManage && (
          <Button variant="primary" icon={Plus} onClick={() => setDrawerOpen(true)}>
            Create a list
          </Button>
        )}
      </div>

      {visibleLists.length === 0 ? (
        <EmptyState
          title="No lists found"
          description="Lists are static, manually-curated contact groups organized into folders - great for a one-off send to a hand-picked audience."
          action={canManage && <Button variant="primary" icon={Plus} onClick={() => setDrawerOpen(true)}>Create a list</Button>}
        />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "List", render: (l) => <Link href={`/lists/${l.id}`} className="font-medium text-primary hover:underline">{l.name}</Link> },
            { key: "id", header: "ID", render: (l) => `#${l.id}` },
            { key: "folder", header: "Folder", render: (l) => l.folder?.name || "—" },
            { key: "contactCount", header: "Contacts", render: (l) => l.contactCount.toLocaleString() },
            { key: "createdAt", header: "Creation date", render: (l) => formatDate(l.createdAt) },
            ...(canDelete
              ? [{
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (l) => <DeleteListButton id={l.id} name={l.name} />,
                }]
              : []),
          ]}
          rows={visibleLists}
        />
      )}

      <CreateListDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} folders={folders} />
    </div>
  );
}

function DeleteListButton({ id, name }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete the list "${name}"? Contacts in it are not deleted, only the list itself.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const result = await deleteListAction(fd);
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`List "${name}" deleted.`);
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} title="Delete list" className="p-1.5 rounded text-ink-muted hover:text-danger hover:bg-surface-alt">
      <Trash2 className="size-3.5" />
    </button>
  );
}

function CreateListDrawer({ open, onClose, folders }) {
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(folders[0]?.id ? String(folders[0].id) : "");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [localFolders, setLocalFolders] = useState(folders);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function handleFolderChange(value) {
    if (value === NEW_FOLDER_VALUE) {
      setCreatingFolder(true);
      return;
    }
    setFolderId(value);
  }

  function saveNewFolder() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newFolderName);
      const result = await createFolderAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setLocalFolders((prev) => [...prev, { id: result.id, name: result.name }]);
      setFolderId(String(result.id));
      setNewFolderName("");
      setCreatingFolder(false);
      push(`Folder "${result.name}" created.`);
    });
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("List name is required.");
      return;
    }
    if (!folderId) {
      setError("Choose a folder, or create a new one.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("folderId", folderId);
      const result = await createListAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`List "${name}" created.`);
      setName("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Create a list"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={isPending} onClick={save}>Create</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Name of the list" htmlFor="list-name" required>
          <Input id="list-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter a list name" autoFocus />
        </Field>

        <Field label="Folder" htmlFor="list-folder" required>
          <Select id="list-folder" value={creatingFolder ? NEW_FOLDER_VALUE : folderId} onChange={(e) => handleFolderChange(e.target.value)}>
            <option value="" disabled>Select a folder</option>
            {localFolders.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.name}</option>
            ))}
            <option value={NEW_FOLDER_VALUE}>+ Create a new folder</option>
          </Select>
        </Field>

        {creatingFolder && (
          <div className="rounded-md border border-border bg-surface-alt p-3.5 flex flex-col gap-3">
            <Field label="Name of the folder" htmlFor="new-folder-name">
              <Input id="new-folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter a folder name" autoFocus />
            </Field>
            <div className="flex gap-2">
              <Button type="button" variant="primary" size="sm" icon={FolderPlus} loading={isPending} onClick={saveNewFolder}>Create folder</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingFolder(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Drawer>
  );
}
