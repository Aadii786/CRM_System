"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Select, Textarea, Input } from "@/components/ui/Field";
import { logEmailAction } from "@/actions/emailLog";
import { useToast } from "@/components/ui/Toast";

/** Record a one-to-one email (sent or received) on the timeline of a contact, deal or company (MIR-4.4). */
export default function LogEmailButton({ contactId, companyId, dealId, revalidatePathValue }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await logEmailAction(null, formData);
      if (result?.error) { setError(result.error); return; }
      setError(null);
      push("Email recorded.");
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" icon={MailPlus} onClick={() => setOpen(true)}>Log Email</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log an email" description="Record an email you sent or received outside the CRM, so the history stays in one place.">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          {companyId && <input type="hidden" name="companyId" value={companyId} />}
          {dealId && <input type="hidden" name="dealId" value={dealId} />}
          <input type="hidden" name="revalidatePath" value={revalidatePathValue} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction" htmlFor="email-direction">
              <Select id="email-direction" name="direction" defaultValue="sent">
                <option value="sent">Sent (we wrote)</option>
                <option value="received">Received (they wrote)</option>
              </Select>
            </Field>
            <Field label="Date" htmlFor="email-date">
              <Input id="email-date" name="occurredAt" type="date" />
            </Field>
          </div>
          <Field label="Subject" htmlFor="email-subject" required>
            <Input id="email-subject" name="subject" required placeholder="Subject of the email" />
          </Field>
          <Field label="Message" htmlFor="email-body">
            <Textarea id="email-body" name="body" rows={5} placeholder="Paste the text of the email (optional)" />
          </Field>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Save email</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
