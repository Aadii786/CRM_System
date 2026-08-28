function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-9 text-sm", lg: "size-12 text-base" };

export default function Avatar({ name, color = "#4F46E5", size = "md", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        SIZES[size],
        className,
      ].join(" ")}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
