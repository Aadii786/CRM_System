"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Select, Textarea, Input } from "@/components/ui/Field";
import { logCallAction } from "@/actions/calls";
import { useToast } from "@/components/ui/Toast";

const OUTCOMES = ["Connected", "No Answer", "Voicemail Left", "Follow-up Needed", "Wrong Number"];

/**
 * Log a phone call as a real activity-timeline record - the one
 * communication channel (telephone) that had no logging mechanism before
 * (WhatsApp and simulated email already did). Reusable across contact/
 * deal/company detail pages.
 */
export default function LogCallButton({ contactId, companyId, dealId, revalidatePathValue }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef(null);
  const { push } = useToast();
  const router = useRouter();

  function handleSubmit(formData) {
    startTransition(async () => {
      const result = await logCallAction(null, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      push("Call logged.");
      setOpen(false);
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" icon={Phone} onClick={() => setOpen(true)}>
        Log Call
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log Call">
        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          {contactId && <input type="hidden" name="contactId" value={contactId} />}
          {companyId && <input type="hidden" name="companyId" value={companyId} />}
          {dealId && <input type="hidden" name="dealId" value={dealId} />}
          <input type="hidden" name="revalidatePath" value={revalidatePathValue} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction" htmlFor="call-direction">
              <Select id="call-direction" name="direction" defaultValue="outbound">
                <option value="outbound">Outbound (we called)</option>
                <option value="inbound">Inbound (they called)</option>
              </Select>
            </Field>
            <Field label="Outcome" htmlFor="call-outcome">
              <Select id="call-outcome" name="outcome" defaultValue="Connected">
                {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Duration (minutes)" htmlFor="call-duration">
            <Input id="call-duration" name="durationMinutes" type="number" min="0" placeholder="Optional" />
          </Field>
          <Field label="Notes" htmlFor="call-notes">
            <Textarea id="call-notes" name="notes" rows={3} placeholder="What was discussed..." />
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Log Call</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
