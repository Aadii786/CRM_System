import { SkeletonBlock } from "@/components/ui/Skeleton";

export default function DealsLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="w-72 shrink-0">
            <SkeletonBlock className="h-4 w-24 mb-3" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 3 }).map((_, card) => (
                <div key={card} className="rounded-lg border border-border bg-surface p-3.5">
                  <SkeletonBlock className="h-4 w-full mb-2" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
