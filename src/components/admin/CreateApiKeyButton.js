"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Copy, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input } from "@/components/ui/Field";
import { createApiKeyAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function CreateApiKeyButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [rawKey, setRawKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await createApiKeyAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setRawKey(result.rawKey);
      push("API key created.");
    });
  }

  function close() {
    setOpen(false);
    setRawKey(null);
    setCopied(false);
    formRef.current?.reset();
  }

  function copy() {
    navigator.clipboard?.writeText(rawKey);
    setCopied(true);
  }

  return (
    <>
      <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New API Key</Button>
      <Modal open={open} onClose={close} title="Create API Key">
        {rawKey ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-secondary">
              Copy this key now - for security it will never be shown again (only the masked prefix is stored).
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-alt px-3 py-2.5 font-mono text-xs break-all">
              {rawKey}
            </div>
            <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? "Copied" : "Copy Key"}</Button>
            <div className="flex justify-end">
              <Button variant="primary" onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
            <Field label="Key Name" htmlFor="key-name" required>
              <Input id="key-name" name="name" required placeholder="e.g. Website Integration" autoFocus />
            </Field>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Generate Key</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
