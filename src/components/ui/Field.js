// Consistent label + input + error-message wrapper used by every form in
// the app (requirements #77): labels, required markers and error text are
// always rendered the same way so forms never look ad-hoc.
export default function Field({ label, htmlFor, required, error, hint, className = "", children }) {
  return (
    <div className={["flex flex-col gap-1.5", className].join(" ")}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const baseInputClasses =
  "h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary " +
  "disabled:bg-surface-alt disabled:text-ink-muted transition-colors";

export function Input({ className = "", invalid = false, ...props }) {
  return (
    <input
      className={[baseInputClasses, invalid ? "border-danger" : "", className].join(" ")}
      {...props}
    />
  );
}

export function Textarea({ className = "", invalid = false, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={[baseInputClasses, "h-auto py-2 resize-y", invalid ? "border-danger" : "", className].join(" ")}
      {...props}
    />
  );
}

export function Select({ className = "", invalid = false, children, ...props }) {
  return (
    <select
      className={[baseInputClasses, "appearance-none bg-no-repeat pr-8", invalid ? "border-danger" : "", className].join(" ")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2398a2b3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 8px center",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({ className = "", label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
      <input
        type="checkbox"
        className={[
          "size-4 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          className,
        ].join(" ")}
        {...props}
      />
      {label}
    </label>
  );
}
