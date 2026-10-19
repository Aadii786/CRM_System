"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field, { Input } from "@/components/ui/Field";
import { resetUserPasswordAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

// Letters and digits that cannot be confused with each other (no 0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword() {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
  return `${body}7a`;
}

/** Lets an administrator or department head set a new password for a user who forgot theirs. */
export default function ResetPasswordButton({ user }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  function close() {
    setOpen(false);
    setPassword("");
    setError(null);
    setDone(false);
  }

  function submit(e) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", user.id);
      fd.set("password", password);
      const result = await resetUserPasswordAction(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setDone(true);
      push(`Password reset for ${user.name}.`);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Reset password" className="p-1.5 rounded text-ink-muted hover:text-primary hover:bg-surface-alt">
        <KeyRound className="size-3.5" />
      </button>
      <Modal open={open} onClose={close} title="Reset password" description={`${user.name} (${user.email})`}>
        {done ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">The new password is set. Give it to {user.name} now: it is not shown again.</p>
            <p className="rounded-md border border-border bg-surface-alt px-3 py-2 font-mono text-sm text-ink select-all">{password}</p>
            <div className="flex justify-end">
              <Button variant="primary" onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="New password" htmlFor={`rp-${user.id}`} required hint="At least 8 characters with a letter and a number.">
              <div className="flex gap-2">
                <Input id={`rp-${user.id}`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus required />
                <Button type="button" variant="secondary" icon={RefreshCw} onClick={() => setPassword(generatePassword())}>Generate</Button>
              </div>
            </Field>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
              <Button type="submit" variant="primary" loading={isPending}>Reset password</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
