"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2, Paperclip } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { uploadDocumentAction } from "@/actions/documents";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils/format";

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attach/list documents on any record (contact, company, deal, meeting) -
 * requirements: "meeting minutes and relevant documents attached to the
 * respective client/query record."
 */
export default function DocumentsPanel({ relatedType, relatedId, documents, canManage, revalidatePathValue, onChanged }) {
  const [uploading, startUpload] = useTransition();
  const [deletingId, startDeleteTransition] = useTransition();
  const [error, setError] = useState(null);
  const formRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const { push } = useToast();
  const router = useRouter();

  function handleUpload(formData) {
    startUpload(async () => {
      const result = await uploadDocumentAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Document uploaded.");
      formRef.current?.reset();
      setFileName("");
      router.refresh();
      onChanged?.();
    });
  }

  function handleDelete(doc) {
    startDeleteTransition(async () => {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (res.ok) {
        push(`"${doc.name}" deleted.`);
        router.refresh();
        onChanged?.();
      } else {
        const body = await res.json().catch(() => ({}));
        push(body.error || "Could not delete document.", { type: "error" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <form ref={formRef} action={handleUpload} className="flex flex-col gap-2.5 rounded-lg border border-dashed border-border-strong p-3.5">
          <input type="hidden" name="relatedType" value={relatedType} />
          <input type="hidden" name="relatedId" value={relatedId} />
          <input type="hidden" name="revalidatePath" value={revalidatePathValue} />
          <div className="flex items-center gap-2.5">
            <label className="flex-1 flex items-center gap-2 h-9 rounded-md border border-border-strong bg-surface-alt px-3 text-sm text-ink-muted cursor-pointer hover:border-primary-border">
              <Paperclip className="size-4 shrink-0" />
              <span className="truncate">{fileName || "Choose a file to attach..."}</span>
              <input
                type="file"
                name="file"
                required
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
              />
            </label>
            <Button type="submit" variant="secondary" icon={Upload} loading={uploading} disabled={!fileName}>
              Upload
            </Button>
          </div>
          <Input name="description" placeholder="Optional description (e.g. Meeting minutes - 12 Aug)" className="h-8 text-xs" />
          {error && <p className="text-xs text-danger">{error}</p>}
          <p className="text-[11px] text-ink-muted">PDF, Word, Excel, PowerPoint, images, text or CSV - up to 15MB.</p>
        </form>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents attached" description="Meeting minutes, proposals and other files will appear here." />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-muted">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                <p className="text-xs text-ink-muted truncate">
                  {doc.description ? `${doc.description} · ` : ""}
                  {formatBytes(doc.fileSize)} · {doc.uploader?.name || "Unknown"} · {timeAgo(doc.createdAt)}
                </p>
              </div>
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Download ${doc.name}`}
                className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-primary shrink-0"
              >
                <Download className="size-4" />
              </a>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId}
                  aria-label={`Delete ${doc.name}`}
                  className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-danger-subtle hover:text-danger shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
