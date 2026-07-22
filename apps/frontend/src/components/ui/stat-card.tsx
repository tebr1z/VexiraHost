import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("panel-card rounded-lg p-4 sm:p-5", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
