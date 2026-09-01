"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Field, { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createSegmentAction, previewSegmentCountAction } from "@/actions/segments";

const FIELD_OPTIONS = [
  { value: "status", label: "Status", type: "select", options: ["New", "Engaged", "Interested", "Qualified", "Inactive", "Converted", "Unsubscribed", "Bounced"] },
  { value: "engagementStatus", label: "Email Engagement", type: "select", options: ["Delivered", "Opened", "Clicked", "Bounced", "Unsubscribed", "Engaged", "Inactive"] },
  { value: "leadScore", label: "Lead Score", type: "number" },
  { value: "source", label: "Source", type: "text" },
  { value: "city", label: "Location (City)", type: "text" },
];
const OPERATORS = {
  select: [{ value: "equals", label: "is" }],
  number: [{ value: "gte", label: "is at least" }, { value: "lte", label: "is at most" }],
  text: [{ value: "equals", label: "is" }],
};

const initialState = { error: null };

export default function SegmentBuilder({ open, onClose, departmentKey }) {
  const [conditions, setConditions] = useState([{ field: "leadScore", operator: "gte", value: "70" }]);
  const [count, setCount] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(createSegmentAction, initialState);
  const { push } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      push("Segment created.");
      onClose();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    startTransition(async () => {
      const c = await previewSegmentCountAction(departmentKey, conditions.filter((c) => c.value !== ""));
      setCount(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(conditions), departmentKey]);

  function updateCondition(idx, patch) {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addCondition() {
    setConditions((prev) => [...prev, { field: "status", operator: "equals", value: "" }]);
  }
  function removeCondition(idx) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Modal open={open} onClose={onClose} title="Build Segment" description="Combine filters to define a dynamic audience." size="lg">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="conditions" value={JSON.stringify(conditions)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Segment Name" htmlFor="seg-name" required>
            <Input id="seg-name" name="name" required placeholder="e.g. High Intent Leads" />
          </Field>
          <Field label="Description" htmlFor="seg-desc">
            <Input id="seg-desc" name="description" placeholder="Optional" />
          </Field>
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-2">Conditions</p>
          <div className="flex flex-col gap-2.5">
            {conditions.map((cond, idx) => {
              const fieldDef = FIELD_OPTIONS.find((f) => f.value === cond.field);
              const ops = OPERATORS[fieldDef?.type || "text"];
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={cond.field} onChange={(e) => updateCondition(idx, { field: e.target.value, operator: OPERATORS[FIELD_OPTIONS.find((f) => f.value === e.target.value)?.type || "text"][0].value })} className="w-44">
                    {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </Select>
                  <Select value={cond.operator} onChange={(e) => updateCondition(idx, { operator: e.target.value })} className="w-32">
                    {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  {fieldDef?.type === "select" ? (
                    <Select value={cond.value} onChange={(e) => updateCondition(idx, { value: e.target.value })} className="flex-1">
                      <option value="">Select...</option>
                      {fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  ) : (
                    <Input value={cond.value} onChange={(e) => updateCondition(idx, { value: e.target.value })} className="flex-1" placeholder="Value" />
                  )}
                  <button type="button" onClick={() => removeCondition(idx)} className="p-2 text-ink-muted hover:text-danger" aria-label="Remove condition">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addCondition} className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-medium">
            <Plus className="size-4" /> Add condition
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-primary-border bg-primary-subtle px-3.5 py-2.5 text-sm">
          <Users className="size-4 text-primary-active" />
          <span className="text-primary-active font-medium">
            {isPending ? "Calculating..." : `${(count ?? 0).toLocaleString()} matching contacts`}
          </span>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={pending}>Create Segment</Button>
        </div>
      </form>
    </Modal>
  );
}
