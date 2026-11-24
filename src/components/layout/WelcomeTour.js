"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ROLES } from "@/lib/constants/guide";

/**
 * First-login welcome: a short step-by-step tour for the person's role. It opens once per person
 * (remembered in this browser); "Take the tour" in the menu or the Guide page opens it again.
 */
export default function WelcomeTour({ userId, userName, guideKey, deliveryNotice = "demo" }) {
  const role = ROLES[guideKey] || ROLES.sales;
  const storageKey = `crm-tour-seen-${userId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let seen = false;
    try { seen = Boolean(window.localStorage.getItem(storageKey)); } catch { seen = true; }
    const timer = setTimeout(() => { if (!seen) setOpen(true); }, 400);
    const reopen = () => { setStep(0); setOpen(true); };
    window.addEventListener("crm:open-tour", reopen);
    return () => { clearTimeout(timer); window.removeEventListener("crm:open-tour", reopen); };
  }, [storageKey]);

  function close() {
    setOpen(false);
    try { window.localStorage.setItem(storageKey, "1"); } catch { /* private window: it may show again */ }
  }

  const total = role.steps.length + 1; // welcome + steps
  const current = step === 0 ? null : role.steps[step - 1];

  return (
    <Modal open={open} onClose={close} title={step === 0 ? `Welcome${userName ? `, ${userName.split(" ")[0]}` : ""}` : current.title} description={step === 0 ? `Your role: ${role.label}` : `Step ${step} of ${role.steps.length}`} size="md">
      {step === 0 ? (
        <div className="flex flex-col gap-3 text-sm text-ink-secondary">
          <p className="flex items-start gap-2"><Sparkles className="size-4 mt-0.5 text-primary shrink-0" /> {role.intro}</p>
          <p>This short tour shows what each part of the CRM is for. It takes about a minute. You can open it again any time from the <strong>Guide</strong> page.</p>
          {deliveryNotice === "demo" && <p className="rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-ink">This is the demonstration environment: emails and WhatsApp messages are recorded but not really delivered until the IT department connects the real services.</p>}
          {deliveryNotice === "services" && <p className="rounded-md border border-warning-border bg-warning-subtle px-3 py-2 text-ink">Emails and WhatsApp messages are recorded in the CRM but not yet delivered: they start going out when the IT department connects the real email and WhatsApp services.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm text-ink-secondary">
          <p>{current.body}</p>
          {current.href && <button type="button" onClick={() => { close(); router.push(current.href); }} className="self-start text-primary hover:underline">Open this screen</button>}
        </div>
      )}
      <div className="flex items-center justify-between mt-5">
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => <span key={i} className={["h-1.5 w-5 rounded-full", i <= step ? "bg-primary" : "bg-border"].join(" ")} />)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={close}>Skip</Button>
          {step > 0 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < total - 1 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>{step === 0 ? "Start the tour" : "Next"}</Button>
          ) : (
            <Link href="/guide" onClick={close} className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-medium text-white hover:bg-primary-hover">Finish: open the full guide</Link>
          )}
        </div>
      </div>
    </Modal>
  );
}
