import Link from "next/link";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-gradient-to-b from-[#6058ea] to-primary text-white hover:from-primary hover:to-primary-hover active:to-primary-active shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30 border border-transparent",
  secondary: "bg-surface text-ink border border-border-strong hover:bg-surface-alt shadow-xs",
  ghost: "bg-transparent text-ink-secondary hover:bg-surface-alt border border-transparent",
  danger: "bg-danger text-white hover:brightness-95 border border-transparent shadow-xs",
  "danger-ghost": "bg-transparent text-danger hover:bg-danger-subtle border border-transparent",
};

const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-10 px-4 text-[15px] gap-2",
};

/**
 * Shared button used everywhere in the app so every interactive control
 * gets the same states for free: hover, active, disabled, loading, and a
 * visible keyboard focus ring (requirements #56, #75, #77).
 */
export default function Button({
  as,
  href,
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const classes = [
    "inline-flex items-center justify-center rounded-md font-medium transition-all",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(" ");

  const content = (
    <>
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
      {!loading && IconRight && <IconRight className="size-4" aria-hidden="true" />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled} {...props}>
        {content}
      </Link>
    );
  }

  const Component = as || "button";
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </Component>
  );
}
