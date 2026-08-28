"use client";

import { useState, useTransition } from "react";
import { Play, CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { runDemoAutomationAction } from "@/actions/automations";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

const DEMO_STEPS = [
  "Contacts entered",
  "Email #1 evaluated",
  "Engagement condition checked",
  "Email #2 / #3 sent",
  "Interested contacts identified",
  "WhatsApp message sent",
  "Staff assigned",
  "Follow-up task created",
];

/** "Run Demo Automation" (requirements #62) with a visible step-by-step progress display. */
export default function RunDemoAutomationButton({ automationId, canExecute }) {
  const [open, setOpen] = useState(false);
  const [visibleStep, setVisibleStep] = useState(0);
  const [result, setResult] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function run() {
    setOpen(true);
    setResult(null);
    setVisibleStep(0);

    const interval = setInterval(() => {
      setVisibleStep((s) => (s < DEMO_STEPS.length - 1 ? s + 1 : s));
    }, 450);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", automationId);
      const res = await runDemoAutomationAction(fd);
      clearInterval(interval);
      setVisibleStep(DEMO_STEPS.length - 1);
      setResult(res);
      push(`Automation run: ${res.processed} contacts processed, ${res.converted} converted.`);
      router.refresh();
    });
  }

  if (!canExecute) return null;

  return (
    <>
      <Button variant="primary" icon={Play} onClick={run}>
        Run Demo Automation
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Running Automation" description="Simulated execution against a live batch of contacts.">
        <div className="flex flex-col gap-2.5">
          {DEMO_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2.5 text-sm">
              {i < visibleStep || (i === visibleStep && result) ? (
                <CheckCircle2 className="size-4 text-success shrink-0" />
              ) : i === visibleStep ? (
                <Loader2 className="size-4 text-primary animate-spin shrink-0" />
              ) : (
                <span className="size-4 rounded-full border border-border shrink-0" />
              )}
              <span className={i <= visibleStep ? "text-ink" : "text-ink-muted"}>{step}</span>
            </div>
          ))}
        </div>
        {result && (
          <div className="mt-4 rounded-md border border-success-border bg-success-subtle px-3.5 py-3 text-sm text-success">
            Processed {result.processed} contacts - {result.converted} converted and handed off to WhatsApp follow-up.
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  );
}
