import { SkeletonBlock, SkeletonMetricGrid } from "@/components/ui/Skeleton";

export default function ExecutiveDashboardLoading() {
  return (
    <div>
      <SkeletonBlock className="h-6 w-56 mb-2" />
      <SkeletonBlock className="h-4 w-96 mb-5" />
      <SkeletonMetricGrid count={12} />
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5">
            <SkeletonBlock className="h-4 w-40 mb-4" />
            <SkeletonBlock className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
