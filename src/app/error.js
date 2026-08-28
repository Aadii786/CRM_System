"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

// Root error boundary (requirements #73): shows a human-friendly message
// and never leaks a raw stack trace to the user.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-bg">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger-subtle text-danger mb-5">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="text-xl font-semibold text-ink mb-2">Something went wrong</h1>
      <p className="text-sm text-ink-muted max-w-sm mb-6">
        An unexpected error occurred while loading this page. You can try again, or head back to your dashboard.
      </p>
      <div className="flex gap-2.5">
        <Button onClick={reset} variant="primary">
          Try Again
        </Button>
        <Button href="/dashboard" variant="secondary">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
