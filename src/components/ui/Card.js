export default function Card({ className = "", padding = "md", children, ...props }) {
  const paddings = { none: "", sm: "p-3", md: "p-5", lg: "p-6" };
  return (
    <div
      className={[
        "rounded-lg border border-border bg-surface shadow-xs",
        paddings[padding],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className = "" }) {
  return (
    <div className={["flex items-start justify-between gap-4 mb-4", className].join(" ")}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="text-sm text-ink-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
