"use client";

import { useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import DocumentsPanel from "@/components/documents/DocumentsPanel";
import { listDocumentsAction } from "@/actions/documents";

/** Attach meeting minutes / documents to a meeting record (no dedicated meeting detail page exists yet, so this opens as a drawer from the list row). */
export default function MeetingDocumentsButton({ meeting, canManage }) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(false);

  async function refetch() {
    setLoading(true);
    const docs = await listDocumentsAction("meeting", meeting.id);
    setDocuments(docs);
    setLoading(false);
  }

  function handleOpen() {
    setOpen(true);
    refetch();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Attach documents to ${meeting.title}`}
        className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-primary shrink-0"
      >
        <Paperclip className="size-4" />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Documents" width="max-w-lg">
        <p className="text-xs text-ink-muted mb-4">Meeting minutes and related files for &quot;{meeting.title}&quot;.</p>
        {loading || !documents ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted py-8 justify-center">
            <Loader2 className="size-4 animate-spin" /> Loading...
          </div>
        ) : (
          <DocumentsPanel
            relatedType="meeting"
            relatedId={meeting.id}
            documents={documents}
            canManage={canManage}
            revalidatePathValue="/meetings"
            onChanged={refetch}
          />
        )}
      </Drawer>
    </>
  );
}
