import { LoadingSkeleton, LoadingSkeletonList } from "@/components/ui/loading-skeleton";

export default function AdminPanelLoading(): React.ReactElement {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading">
      <LoadingSkeleton className="h-10 w-56" />
      <LoadingSkeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <LoadingSkeletonList rows={6} />
    </div>
  );
}
