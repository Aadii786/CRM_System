"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createAutomationAction } from "@/actions/automations";
import { useToast } from "@/components/ui/Toast";

const TRIGGERS = [
  { value: "contact_added", label: "Contact Added" },
  { value: "segment_entered", label: "Contact Enters Segment" },
  { value: "campaign_sent", label: "Campaign Sent" },
  { value: "email_opened", label: "Email Opened" },
  { value: "email_clicked", label: "Email Clicked" },
  { value: "whatsapp_response", label: "WhatsApp Response" },
  { value: "deal_stage_changed", label: "Deal Stage Changed" },
  { value: "form_submitted", label: "Form Submitted" },
];

const initialState = { error: null };

export default function NewAutomationForm() {
  const [state, formAction, pending] = useActionState(createAutomationAction, initialState);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push("Automation created as a draft with its trigger. Build out the rest from the automation detail page.");
      router.push(`/automations/${state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <Field label="Automation Name" htmlFor="a-name" required>
        <Input id="a-name" name="name" required placeholder="e.g. Website Visitor Nurture" />
      </Field>
      <Field label="Description" htmlFor="a-desc">
        <Textarea id="a-desc" name="description" rows={3} />
      </Field>
      <Field label="Trigger" htmlFor="a-trigger" required hint="What starts this automation.">
        <Select id="a-trigger" name="triggerType" required defaultValue="contact_added">
          {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="primary" loading={pending} className="self-start">Create Automation</Button>
    </form>
  );
}
