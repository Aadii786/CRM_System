export default function FilterBar({ children, className = "" }) {
  return <div className={["flex flex-wrap items-center gap-2.5 mb-4", className].join(" ")}>{children}</div>;
}
