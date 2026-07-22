import { cn } from "@/lib/cn";

export function LoadingSkeleton({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-outline-variant/30", className)}
      aria-hidden
    />
  );
}

export function LoadingSkeletonList({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
