"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

// Visible demo indicator (requirements #63): makes it unmistakable that no
// real emails/WhatsApp messages are ever sent and no external APIs are
// actually called from this environment.
export default function DemoEnvironmentBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-2.5 border-b border-warning-border bg-warning-subtle px-4 py-1.5 text-xs text-warning">
      <Info className="size-3.5 shrink-0" />
      <p className="flex-1">
        <strong className="font-semibold">DEMO ENVIRONMENT</strong> - all data is simulated. No real emails or WhatsApp messages are sent and no external systems are contacted.
      </p>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 hover:opacity-70">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
