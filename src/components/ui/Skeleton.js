export function Skeleton({ className = "" }) {
  return <div className={["animate-pulse rounded-md bg-surface-alt", className].join(" ")} />;
}

export function SkeletonRow({ columns = 5 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 8, columns = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </tbody>
  );
}

export function SkeletonKpiCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-3.5 w-24 mb-3" />
      <Skeleton className="h-7 w-20 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonChartCard({ height = "h-72" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton className="h-3.5 w-40 mb-4" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  );
}
