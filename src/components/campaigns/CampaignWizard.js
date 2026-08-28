"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Field, { Input, Textarea, Select } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import { createCampaignAction } from "@/actions/campaigns";
import { useToast } from "@/components/ui/Toast";

const STEPS = ["Campaign Details", "Audience", "Email Content", "Schedule", "Review & Send"];

const initialState = { error: null };

export default function CampaignWizard({ segments }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    senderName: "University Admissions Office",
    senderEmail: "admissions@university.edu.pk",
    replyTo: "admissions@university.edu.pk",
    segmentId: segments[0]?.id || "",
    bodyText: "Hi {{firstName}},\n\nWe're excited to share more about our upcoming programs...",
    schedule: "",
  });
  const [state, formAction, pending] = useActionState(createCampaignAction, initialState);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push("Campaign created as a draft.");
      router.push(`/campaigns/${state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  const selectedSegment = segments.find((s) => String(s.id) === String(form.segmentId));

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 shrink-0">
            <div
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border",
                i < stepIndex ? "bg-success-subtle text-success border-success-border" :
                i === stepIndex ? "bg-primary-subtle text-primary-active border-primary-border" :
                "bg-surface-alt text-ink-muted border-border",
              ].join(" ")}
            >
              {i < stepIndex ? <CheckCircle2 className="size-3.5" /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        ))}
      </div>

      <Card>
        {stepIndex === 0 && (
          <div className="flex flex-col gap-4 max-w-lg">
            <Field label="Campaign Name" htmlFor="name" required>
              <Input id="name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Fall Admissions - Email #1" />
            </Field>
            <Field label="Subject Line" htmlFor="subject" required>
              <Input id="subject" value={form.subject} onChange={(e) => update({ subject: e.target.value })} placeholder="e.g. Discover programs built for you" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Sender Name" htmlFor="senderName">
                <Input id="senderName" value={form.senderName} onChange={(e) => update({ senderName: e.target.value })} />
              </Field>
              <Field label="Sender Email" htmlFor="senderEmail">
                <Input id="senderEmail" value={form.senderEmail} onChange={(e) => update({ senderEmail: e.target.value })} />
              </Field>
            </div>
            <Field label="Reply-To" htmlFor="replyTo">
              <Input id="replyTo" value={form.replyTo} onChange={(e) => update({ replyTo: e.target.value })} />
            </Field>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="max-w-lg">
            <Field label="Audience Segment" htmlFor="segmentId" required>
              <Select id="segmentId" value={form.segmentId} onChange={(e) => update({ segmentId: e.target.value })}>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.contactCount.toLocaleString()})</option>
                ))}
              </Select>
            </Field>
            {selectedSegment && (
              <p className="text-sm text-ink-muted mt-3">
                This campaign will target <strong className="text-ink">{selectedSegment.contactCount.toLocaleString()}</strong> contacts in the &quot;{selectedSegment.name}&quot; segment.
              </p>
            )}
          </div>
        )}

        {stepIndex === 2 && (
          <div className="max-w-lg">
            <Field label="Email Body" htmlFor="bodyText" hint="Use {{firstName}} to personalize the email for each recipient.">
              <Textarea id="bodyText" rows={8} value={form.bodyText} onChange={(e) => update({ bodyText: e.target.value })} />
            </Field>
            <div className="mt-4 rounded-md border border-border bg-surface-alt p-4">
              <p className="text-xs text-ink-muted mb-1.5">Preview</p>
              <p className="text-sm font-semibold text-ink">{form.subject || "(no subject)"}</p>
              <p className="text-sm text-ink-secondary whitespace-pre-line mt-1">{form.bodyText.replace("{{firstName}}", "John")}</p>
            </div>
          </div>
        )}

        {stepIndex === 3 && (
          <div className="max-w-lg">
            <Field label="Schedule (optional)" htmlFor="schedule" hint="Leave blank to save as a draft you can send manually.">
              <Input id="schedule" type="datetime-local" value={form.schedule} onChange={(e) => update({ schedule: e.target.value })} />
            </Field>
          </div>
        )}

        {stepIndex === 4 && (
          <form action={formAction} className="max-w-lg flex flex-col gap-4">
            <input type="hidden" name="name" value={form.name} />
            <input type="hidden" name="subject" value={form.subject} />
            <input type="hidden" name="senderName" value={form.senderName} />
            <input type="hidden" name="senderEmail" value={form.senderEmail} />
            <input type="hidden" name="replyTo" value={form.replyTo} />
            <input type="hidden" name="segmentId" value={form.segmentId} />
            <input type="hidden" name="bodyText" value={form.bodyText} />
            <input type="hidden" name="schedule" value={form.schedule} />

            <dl className="divide-y divide-border rounded-md border border-border">
              <ReviewRow label="Name" value={form.name} />
              <ReviewRow label="Subject" value={form.subject} />
              <ReviewRow label="Audience" value={`${selectedSegment?.name || "—"} (${(selectedSegment?.contactCount || 0).toLocaleString()})`} />
              <ReviewRow label="Sender" value={`${form.senderName} <${form.senderEmail}>`} />
              <ReviewRow label="Schedule" value={form.schedule ? new Date(form.schedule).toLocaleString() : <Badge tone="neutral">Save as draft</Badge>} />
            </dl>
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <div className="flex justify-between">
              <Button type="button" variant="ghost" icon={ArrowLeft} onClick={back}>Back</Button>
              <Button type="submit" variant="primary" loading={pending}>
                {form.schedule ? "Schedule Campaign" : "Save as Draft"}
              </Button>
            </div>
          </form>
        )}

        {stepIndex < 4 && (
          <div className="flex justify-between mt-6">
            <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={stepIndex === 0}>Back</Button>
            <Button variant="primary" iconRight={ArrowRight} onClick={next} disabled={stepIndex === 0 && (!form.name || !form.subject)}>
              Continue
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value}</span>
    </div>
  );
}
