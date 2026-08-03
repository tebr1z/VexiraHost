import { MaterialIcon } from "@/components/landing/material-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Accent = "blue" | "violet" | "cyan" | "amber" | "emerald";

const ACCENT_STYLES: Record<Accent, { border: string; iconBg: string; iconText: string }> = {
  blue: {
    border: "border-l-[var(--accent)]",
    iconBg: "bg-[var(--accent)]/10",
    iconText: "text-[var(--accent)]",
  },
  violet: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-600 dark:text-violet-400",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-600 dark:text-cyan-400",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
};

export function DashboardOverviewStat({
  href,
  label,
  value,
  icon,
  accent = "blue",
}: {
  href: string;
  label: string;
  value: number | string;
  icon: string;
  accent?: Accent;
}): React.ReactElement {
  const styles = ACCENT_STYLES[accent];

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-sm transition hover:shadow-md sm:p-5",
        "border-l-4",
        styles.border,
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          styles.iconBg,
        )}
      >
        <MaterialIcon name={icon} className={cn("text-[26px]", styles.iconText)} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold tabular-nums text-[var(--label-primary)] sm:text-3xl">
          {value}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[var(--label-secondary)]">{label}</p>
      </div>
    </Link>
  );
}
