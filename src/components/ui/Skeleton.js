// Shared shimmer-block primitive for route-level loading.js skeletons
// (requirements #14: never leave a blank screen while a page's data
// fetches). Compose these into a rough outline of the real layout rather
// than a generic spinner, so the transition into real content feels
// stable instead of the page "jumping."
export function SkeletonBlock({ className = "" }) {
  return <div className={["skeleton", className].join(" ")} />;
}

export function SkeletonMetricGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2.5">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="size-7 rounded-md" />
          </div>
          <SkeletonBlock className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-4 bg-surface-alt px-4 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBlock key={c} className={["h-3.5 flex-1", c === 0 ? "max-w-[160px]" : ""].join(" ")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
