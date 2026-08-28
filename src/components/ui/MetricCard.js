import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

/**
 * KPI card used across every dashboard (Executive, Marketing, IKL/HSM).
 * When `href` is given the whole card is a drill-down link (requirements
 * #13: clicking a KPI like "58,000 Contacts" should filter into that data).
 */
export default function MetricCard({ label, value, delta, deltaLabel, href, icon: Icon }) {
  const isPositive = typeof delta === "number" && delta >= 0;
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        "block rounded-lg border border-border bg-surface p-5 transition-shadow",
        href ? "hover:shadow-md hover:border-border-strong cursor-pointer" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
        {Icon && <Icon className="size-4 text-ink-muted" aria-hidden="true" />}
      </div>
      <p className="text-2xl font-semibold text-ink tabular-nums">{value}</p>
      {delta != null && (
        <p className={["mt-1.5 inline-flex items-center gap-1 text-xs font-medium", isPositive ? "text-success" : "text-danger"].join(" ")}>
          {isPositive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(delta)}% {deltaLabel || "vs previous period"}
        </p>
      )}
    </Wrapper>
  );
}
