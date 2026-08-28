"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";

export default function PipelineSelect({ pipelines, currentId }) {
  const router = useRouter();
  return (
    <Select value={currentId} onChange={(e) => router.push(`/deals?pipeline=${e.target.value}`)} className="w-56">
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </Select>
  );
}
