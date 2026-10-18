import { cn } from "@/lib/cn";

export function LoadingSkeleton({ className }: { className?: string }): React.ReactElement {
  return <div className={cn("vexira-skeleton", className)} aria-hidden />;
}

export function LoadingSkeletonList({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-24 w-full border border-[var(--separator)]" />
      ))}
    </div>
  );
}
