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
    <div className={cn("vexira-stat-card", className)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--label-secondary)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--label-primary)]">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-[var(--label-secondary)]">{hint}</p>}
    </div>
  );
}
