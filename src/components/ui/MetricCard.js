import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getTone } from "@/lib/constants/moduleColors";

/**
 * KPI card used across every dashboard (Executive, Marketing, IKL/HSM).
 * When `href` is given the whole card is a drill-down link (requirements
 * #13: clicking a KPI like "58,000 Contacts" should filter into that data).
 *
 * `tone` colors the icon so a wall of KPIs reads as "which module is
 * this" at a glance (blue=Contacts, purple=Marketing/Leads, cyan=Deals,
 * green=Revenue/success, amber=needs attention, red=critical) instead of
 * every tile looking identical - see lib/constants/moduleColors.js for the
 * full catalog. Defaults to neutral so existing callers are unaffected.
 */
export default function MetricCard({ label, value, delta, deltaLabel, href, icon: Icon, tone = "neutral" }) {
  const isPositive = typeof delta === "number" && delta >= 0;
  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  const { icon: iconColor, bg: iconBg } = getTone(tone);

  return (
    <Wrapper
      {...wrapperProps}
      className={[
        "block rounded-lg border border-border bg-surface p-5 transition-all",
        href ? "hover:shadow-md hover:border-border-strong hover:-translate-y-0.5 cursor-pointer" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">{label}</p>
        {Icon && (
          <span className={["flex size-7 items-center justify-center rounded-md shrink-0", iconBg].join(" ")}>
            <Icon className={["size-4", iconColor].join(" ")} aria-hidden="true" />
          </span>
        )}
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
