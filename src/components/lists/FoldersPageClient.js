"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, Folder as FolderIcon, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import { createFolderAction, renameFolderAction, deleteFolderAction } from "@/actions/lists";
import { useToast } from "@/components/ui/Toast";

export default function FoldersPageClient({ folders, lists, companies, canManage, canDelete }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const { push } = useToast();
  const router = useRouter();

  const listCountByFolder = useMemo(() => {
    const map = {};
    for (const l of lists) map[l.folderId] = (map[l.folderId] || 0) + 1;
    return map;
  }, [lists]);
  const contactCountByFolder = useMemo(() => {
    const map = {};
    for (const l of lists) map[l.folderId] = (map[l.folderId] || 0) + l.contactCount;
    return map;
  }, [lists]);

  const visibleFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, query]);

  function handleDelete(folder) {
    if (!window.confirm(`Delete the folder "${folder.name}"? Its lists must be empty/moved first.`)) return;
    const fd = new FormData();
    fd.set("id", folder.id);
    deleteFolderAction(fd).then((result) => {
      if (result?.error) {
        push(result.error, { type: "error" });
        return;
      }
      push(`Folder "${folder.name}" deleted.`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search folders..." className="pl-8" />
        </div>
        {canManage && (
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New Folder</Button>
        )}
      </div>

      {visibleFolders.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          tone="purple"
          title="No folders found"
          description="Folders group Lists together, optionally under a company."
          action={canManage && <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>New Folder</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFolders.map((f) => (
            <Card key={f.id}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <Link href={`/folders/${f.id}`} className="flex items-center gap-2 min-w-0">
                  <FolderIcon className="size-4 text-primary shrink-0" />
                  <h3 className="text-sm font-semibold text-ink truncate">{f.name}</h3>
                </Link>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setRenaming(f)} title="Rename" className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-alt">
                      <Pencil className="size-3.5" />
                    </button>
                    {canDelete && (
                      <button type="button" onClick={() => handleDelete(f)} title="Delete" className="p-1 rounded text-ink-muted hover:text-danger hover:bg-surface-alt">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-ink-muted mb-3">{f.Company?.name || "General folder"}</p>
              <div className="flex items-center gap-4 text-sm text-ink-secondary">
                <span>{listCountByFolder[f.id] || 0} lists</span>
                <span>{(contactCountByFolder[f.id] || 0).toLocaleString()} contacts</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateFolderModal open={createOpen} onClose={() => setCreateOpen(false)} companies={companies} />
      {renaming && <RenameFolderModal folder={renaming} onClose={() => setRenaming(null)} />}
    </div>
  );
}

function CreateFolderModal({ open, onClose, companies }) {
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      if (companyId) fd.set("companyId", companyId);
      const result = await createFolderAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push(`Folder "${result.name}" created.`);
      setName("");
      setCompanyId("");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New Folder">
      <div className="flex flex-col gap-4">
        <Field label="Folder Name" htmlFor="f-name" required>
          <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Company" htmlFor="f-company" hint="Optional - leave blank for a general, department-wide folder.">
          <Select id="f-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">General (no company)</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" loading={isPending} onClick={save}>Create Folder</Button>
        </div>
      </div>
    </Modal>
  );
}

function RenameFolderModal({ folder, onClose }) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", folder.id);
      fd.set("name", name);
      const result = await renameFolderAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      push("Folder renamed.");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal open onClose={onClose} title="Rename Folder">
      <div className="flex flex-col gap-4">
        <Field label="Folder Name" htmlFor="rf-name" required>
          <Input id="rf-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
