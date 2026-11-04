"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Field, { Input, Select } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { createDealAction } from "@/actions/deals";
import { LEAD_SOURCES, TRAINING_TYPES } from "@/lib/constants/crm";
import { useToast } from "@/components/ui/Toast";
import ProgramSelect from "@/components/deals/ProgramSelect";

const initialState = { error: null };

export default function DealForm({ pipelines, companies, programs = [] }) {
  const [state, formAction, pending] = useActionState(createDealAction, initialState);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) {
      push("Deal created.");
      router.push(`/deals/${state.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-2xl">
      <Field label="Deal Name" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="e.g. ABC Corp - Leadership Training" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Company" htmlFor="companyId">
          <Select id="companyId" name="companyId" defaultValue="">
            <option value="">— None —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Stage" htmlFor="stageId" required>
          <Select id="stageId" name="stageId" required>
            {pipelines.map((p) => (
              <optgroup key={p.id} label={p.name}>
                {p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Deal Value (PKR)" htmlFor="value">
          <Input id="value" name="value" type="number" min="0" step="1000" placeholder="0" />
        </Field>
        <Field label="Expected Close Date" htmlFor="expectedCloseDate">
          <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Source" htmlFor="source">
          <Select id="source" name="source" defaultValue="Client Visit">
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Training Type" htmlFor="trainingType">
          <Select id="trainingType" name="trainingType" defaultValue="">
            <option value="">— None —</option>
            {TRAINING_TYPES.map((t) => <option key={t.key} value={t.key}>{t.key} - {t.name}</option>)}
          </Select>
        </Field>
      </div>

      {programs.length > 0 && <ProgramSelect programs={programs} idPrefix="newdeal" />}

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex items-center gap-2.5">
        <Button type="submit" variant="primary" loading={pending}>Create Deal</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
