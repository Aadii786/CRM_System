"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Field, { Input, Select } from "@/components/ui/Field";
import { convertContactToDealAction } from "@/actions/deals";
import { useToast } from "@/components/ui/Toast";
import { OPPORTUNITY_NAMES } from "@/lib/constants/crm";

/** One-click lead -> opportunity: opens a deal in the first pipeline stage and marks the lead Qualified. */
export default function ConvertToOpportunityButton({ contact, programs = [] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [existingDealId, setExistingDealId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const who = contact.Company?.name || fullName;

  function submit(formData) {
    startTransition(async () => {
      const result = await convertContactToDealAction(null, formData);
      if (result?.error) {
        setError(result.error);
        setExistingDealId(result.existingDealId || null);
        return;
      }
      push("Converted to an opportunity.");
      setOpen(false);
      router.push(`/deals/${result.id}`);
    });
  }

  if (contact.status === "Converted") return null;

  return (
    <>
      <Button variant="primary" icon={Handshake} onClick={() => setOpen(true)}>Convert to opportunity</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Convert to opportunity" description={`${fullName} becomes a Qualified lead with an open deal.`}>
        <form action={submit} className="flex flex-col gap-4">
          <input type="hidden" name="contactId" value={contact.id} />
          <Field label="Opportunity name" htmlFor="cv-name" required hint={`Saved as "name - ${who}" so deals are easy to tell apart.`}>
            <Select id="cv-name" name="opportunityKind" defaultValue={OPPORTUNITY_NAMES[0]} required>
              {OPPORTUNITY_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <input type="hidden" name="who" value={who} />
          <div className="grid grid-cols-2 gap-3">
            {programs.length > 0 && (
              <Field label="Program" htmlFor="cv-program">
                <Select id="cv-program" name="programId" defaultValue="">
                  <option value="">Not linked to a program</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.title}{p.code ? ` (${p.code})` : ""}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Expected value (PKR)" htmlFor="cv-value">
              <Input id="cv-value" name="value" type="number" min="0" step="1000" placeholder="0" />
            </Field>
          </div>
          <Field label="Expected close date" htmlFor="cv-close">
            <Input id="cv-close" name="expectedCloseDate" type="date" />
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}{" "}
              {existingDealId && <Link href={`/deals/${existingDealId}`} className="underline font-medium">Open it</Link>}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isPending}>Convert</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
