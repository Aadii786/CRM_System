"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Undo2, Play, Pause, Clock4 } from "lucide-react";
import Button from "@/components/ui/Button";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { addAutomationStepAction, removeLastAutomationStepAction, setAutomationStatusAction, setAutomationFilterAction, runDueAutomationsAction } from "@/actions/automations";
import { STEP_OPTIONS, CONDITION_OPTIONS, FORM_TYPE_OPTIONS } from "@/lib/constants/automations";
import { CONTACT_STATUSES } from "@/lib/constants/crm";

/**
 * Builds and runs a follow-up workflow: choose the trigger filter, add steps one after another
 * (wait, send, task, condition), activate it. Active workflows run by themselves.
 */
export default function AutomationBuilder({ automation, programs, canEdit, canExecute }) {
  const [kind, setKind] = useState("wait");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();
  const cfg = automation.triggerConfig || {};
  const showFormFilter = automation.triggerType === "form_submitted";
  const showProgramFilter = ["form_submitted", "registration_created", "program_completed"].includes(automation.triggerType);

  function call(action, fd, message, after) {
    startTransition(async () => {
      const result = await action(fd);
      if (result?.error) {
        setError(result.error);
        push(result.error, { type: "error" });
        return;
      }
      setError(null);
      if (message) push(typeof message === "function" ? message(result) : message);
      after?.();
      router.refresh();
    });
  }

  function addStep(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await addAutomationStepAction(null, fd);
      if (result?.error) return setError(result.error);
      setError(null);
      form.reset();
      setKind("wait");
      push("Step added.");
      router.refresh();
    });
  }

  const simple = (extra) => { const fd = new FormData(); fd.set("id", automation.id); Object.entries(extra || {}).forEach(([k, v]) => fd.set(k, v)); return fd; };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {canExecute && automation.status !== "Active" && (
          <Button variant="primary" icon={Play} loading={isPending} onClick={() => call(setAutomationStatusAction, simple({ status: "Active" }), "Automation is active. It now runs by itself.")}>Activate</Button>
        )}
        {canExecute && automation.status === "Active" && (
          <Button variant="secondary" icon={Pause} loading={isPending} onClick={() => call(setAutomationStatusAction, simple({ status: "Paused" }), "Automation paused. People already inside wait until you activate it again.")}>Pause</Button>
        )}
        {canExecute && (
          <Button variant="secondary" icon={Clock4} loading={isPending} onClick={() => call(runDueAutomationsAction, simple(), (r) => `Checked everyone who is waiting: ${r.advanced ?? 0} moved on.`)} title="The scheduler does this on its own every minute while the CRM is in use">Run waiting steps now</Button>
        )}
        <span className="text-xs text-ink-muted">Active workflows run by themselves: waits end on time and the next step happens without anyone pressing a button.</span>
      </div>

      {canEdit && showProgramFilter && (
        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-alt p-3.5"
          onSubmit={(e) => { e.preventDefault(); call(setAutomationFilterAction, new FormData(e.currentTarget), "Trigger filter saved."); }}
        >
          <input type="hidden" name="id" value={automation.id} />
          <Field label="Only for this program" htmlFor="af-program" className="min-w-52">
            <Select id="af-program" name="programId" defaultValue={cfg.programId || ""}>
              <option value="">Any program</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>
          {showFormFilter && (
            <Field label="Only for this form" htmlFor="af-form" className="min-w-44">
              <Select id="af-form" name="formType" defaultValue={cfg.formType || ""}>
                <option value="">Any form</option>
                {FORM_TYPE_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
            </Field>
          )}
          <Button type="submit" variant="secondary" loading={isPending}>Save filter</Button>
        </form>
      )}

      {canEdit && (
        <form onSubmit={addStep} className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3.5">
          <input type="hidden" name="id" value={automation.id} />
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-ink">Add the next step</h4>
            <Button type="button" variant="ghost" size="sm" icon={Undo2} loading={isPending} onClick={() => call(removeLastAutomationStepAction, simple(), "Last step removed.")}>Remove last step</Button>
          </div>
          <Field label="Step" htmlFor="as-kind">
            <Select id="as-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {STEP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>

          {kind === "wait" && (
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              <Field label="Days" htmlFor="as-days"><Input id="as-days" name="days" type="number" min="0" max="365" defaultValue="3" /></Field>
              <Field label="Hours" htmlFor="as-hours"><Input id="as-hours" name="hours" type="number" min="0" max="23" defaultValue="0" /></Field>
            </div>
          )}
          {kind === "send_email" && (
            <>
              <Field label="Subject" htmlFor="as-subject" required><Input id="as-subject" name="subject" placeholder="Still thinking about our Leadership program?" /></Field>
              <Field label="Message" htmlFor="as-body" required hint="Use {{firstName}}, {{lastName}}, {{fullName}}, {{company}}. An unsubscribe link and open/click tracking are added automatically. Links starting with https:// are tracked."><Textarea id="as-body" name="body" rows={6} /></Field>
            </>
          )}
          {kind === "send_whatsapp" && (
            <Field label="Message" htmlFor="as-message" required hint="Use {{firstName}}, {{lastName}}, {{fullName}}, {{company}}."><Textarea id="as-message" name="message" rows={4} /></Field>
          )}
          {kind === "create_task" && (
            <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
              <Field label="Task title" htmlFor="as-title" required><Input id="as-title" name="title" placeholder="Call {{firstName}} about the next batch" /></Field>
              <Field label="Due in (days)" htmlFor="as-due"><Input id="as-due" name="dueInDays" type="number" min="0" defaultValue="1" /></Field>
            </div>
          )}
          {kind === "notify_owner" && (
            <Field label="Note for the owner (optional)" htmlFor="as-notify"><Input id="as-notify" name="message" placeholder="Follow up with {{fullName}}" /></Field>
          )}
          {kind === "update_status" && (
            <Field label="Set status to" htmlFor="as-status"><Select id="as-status" name="status" defaultValue="Interested">{CONTACT_STATUSES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          )}
          {kind === "condition" && (
            <Field label="Check whether the person" htmlFor="as-cond">
              <Select id="as-cond" name="conditionKey" defaultValue="email_opened">{CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            </Field>
          )}

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div><Button type="submit" variant="primary" icon={Plus} loading={isPending}>Add step</Button></div>
        </form>
      )}
    </div>
  );
}
