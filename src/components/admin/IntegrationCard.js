"use client";

import { useTransition } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { toggleIntegrationAction } from "@/actions/admin";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_LABEL = { native: "Native", third_party: "Third-Party", api: "API / Custom" };
const STATUS_TONE = { connected: "success", disconnected: "neutral", config_required: "warning" };

export default function IntegrationCard({ integration, canManage }) {
  const [isPending, startTransition] = useTransition();
  const { push } = useToast();

  function toggle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("key", integration.key);
      await toggleIntegrationAction(fd);
      push(`${integration.name} ${integration.status === "connected" ? "disconnected" : "connected"} (demo).`);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-ink">{integration.name}</p>
        <Badge tone={STATUS_TONE[integration.status]}>{integration.status.replace("_", " ")}</Badge>
      </div>
      <p className="text-xs text-ink-muted mb-3">{CATEGORY_LABEL[integration.category]} integration</p>
      {canManage && (
        <Button variant="secondary" size="sm" loading={isPending} onClick={toggle} className="w-full">
          {integration.status === "connected" ? "Disconnect" : "Connect"}
        </Button>
      )}
    </div>
  );
}
