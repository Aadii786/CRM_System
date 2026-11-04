"use client";

import { useState, useTransition } from "react";
import { confirmUnsubscribeAction } from "@/actions/unsubscribe";

export default function UnsubscribeForm({ token, senderName, email }) {
  const [result, setResult] = useState(null);
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => setResult(await confirmUnsubscribeAction(token)));
  }

  if (result?.ok) {
    return (
      <div role="status">
        <h1 className="text-xl font-semibold text-ink mb-2">You are unsubscribed</h1>
        <p className="text-sm text-ink-secondary">{email} will no longer receive emails from {senderName}. This can take a few minutes to apply everywhere.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-2">Unsubscribe</h1>
      <p className="text-sm text-ink-secondary mb-5">Stop all emails from {senderName} to <span className="font-medium text-ink">{email}</span>?</p>
      {result && !result.ok && <p className="text-sm text-danger mb-3" role="alert">Something went wrong. Please try again.</p>}
      <button
        type="button"
        onClick={confirm}
        disabled={isPending}
        className="h-10 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {isPending ? "Working..." : "Yes, unsubscribe me"}
      </button>
      <p className="text-xs text-ink-muted mt-4">If you clicked this by mistake, just close this page.</p>
    </div>
  );
}
