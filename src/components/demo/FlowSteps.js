import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** steps: [{ label, href? }] - renders a left-to-right (wraps on mobile) flow diagram. */
export default function FlowSteps({ steps }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <span key={step.label} className="flex items-center gap-2">
          {step.href ? (
            <Link href={step.href} className="rounded-md border border-primary-border bg-primary-subtle px-3 py-1.5 text-xs font-medium text-primary-active hover:bg-primary-subtle/70 transition-colors whitespace-nowrap">
              {step.label}
            </Link>
          ) : (
            <span className="rounded-md border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-ink-secondary whitespace-nowrap">
              {step.label}
            </span>
          )}
          {i < steps.length - 1 && <ArrowRight className="size-3.5 text-ink-muted shrink-0" />}
        </span>
      ))}
    </div>
  );
}
