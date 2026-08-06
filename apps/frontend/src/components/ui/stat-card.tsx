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
    <div
      className={cn(
        "rounded-2xl border border-t-2 border-[var(--separator)] border-t-[var(--accent)] bg-[var(--bg-elevated)] p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg",
        className,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--label-secondary)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--label-primary)]">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-[var(--label-secondary)]">{hint}</p>}
    </div>
  );
}
