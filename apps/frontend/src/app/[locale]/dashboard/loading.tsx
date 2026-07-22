import { LoadingSkeleton, LoadingSkeletonList } from "@/components/ui/loading-skeleton";

export default function DashboardLoading(): React.ReactElement {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <LoadingSkeleton className="h-10 w-56" />
      <LoadingSkeleton className="h-4 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <LoadingSkeletonList rows={5} />
    </div>
  );
}
