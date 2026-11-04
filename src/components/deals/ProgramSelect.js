"use client";

import { useState } from "react";
import Field, { Select } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils/format";

/**
 * Program + batch pair for an inquiry. `programs` is the catalogue with each
 * program's open batches (programService.listProgramOptions). Renders two
 * named selects (programId, batchId) so it works inside any <form>.
 */
export default function ProgramSelect({ programs, defaultProgramId = "", defaultBatchId = "", idPrefix = "pgsel" }) {
  const [programId, setProgramId] = useState(defaultProgramId ? String(defaultProgramId) : "");
  const [batchId, setBatchId] = useState(defaultBatchId ? String(defaultBatchId) : "");
  const batches = programs.find((p) => String(p.id) === programId)?.batches || [];

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Program (catalogue)" htmlFor={`${idPrefix}-program`}>
        <Select id={`${idPrefix}-program`} name="programId" value={programId} onChange={(e) => { setProgramId(e.target.value); setBatchId(""); }}>
          <option value="">Not linked to a program</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.title}{p.code ? ` (${p.code})` : ""}</option>)}
        </Select>
      </Field>
      <Field label="Batch" htmlFor={`${idPrefix}-batch`} hint={programId && batches.length === 0 ? "No open batches yet" : undefined}>
        <Select id={`${idPrefix}-batch`} name="batchId" value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!programId || batches.length === 0}>
          <option value="">Any / not decided</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.code || `Batch ${b.id}`} · {formatDate(b.startDate)}</option>)}
        </Select>
      </Field>
    </div>
  );
}
