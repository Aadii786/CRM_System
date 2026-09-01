"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { updateSettingAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

export default function LeadScoringSettings({ rules, threshold }) {
  const [localRules, setLocalRules] = useState(rules);
  const [localThreshold, setLocalThreshold] = useState(threshold);
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();
  const router = useRouter();

  function updatePoints(idx, points) {
    setLocalRules((prev) => prev.map((r, i) => (i === idx ? { ...r, points: Number(points) } : r)));
  }

  function save() {
    startTransition(async () => {
      const fd1 = new FormData();
      fd1.set("category", "lead_scoring");
      fd1.set("key", "rules");
      fd1.set("value", JSON.stringify(localRules));
      await updateSettingAction(fd1);

      const fd2 = new FormData();
      fd2.set("category", "lead_scoring");
      fd2.set("key", "qualified_threshold");
      fd2.set("value", JSON.stringify(Number(localThreshold)));
      await updateSettingAction(fd2);

      push("Lead scoring settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-2.5">
        {localRules.map((rule, idx) => (
          <div key={rule.event} className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-secondary">{rule.event}</span>
            <div className="flex items-center gap-1.5">
              <Input type="number" value={rule.points} onChange={(e) => updatePoints(idx, e.target.value)} className="w-20 h-8 text-right" />
              <span className="text-xs text-ink-muted">pts</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <span className="text-sm font-medium text-ink">Qualified threshold</span>
        <Input type="number" value={localThreshold} onChange={(e) => setLocalThreshold(e.target.value)} className="w-20 h-8 text-right" />
      </div>
      <Button variant="primary" icon={Save} loading={isPending} onClick={save} className="self-start">Save Changes</Button>
    </div>
  );
}
