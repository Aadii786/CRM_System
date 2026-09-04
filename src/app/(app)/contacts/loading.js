import { SkeletonBlock, SkeletonTable } from "@/components/ui/Skeleton";

export default function ContactsLoading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-40" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-24 rounded-md" />
          <SkeletonBlock className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="flex gap-3 mb-4">
        <SkeletonBlock className="h-9 flex-1 rounded-md" />
        <SkeletonBlock className="h-9 w-32 rounded-md" />
      </div>
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
