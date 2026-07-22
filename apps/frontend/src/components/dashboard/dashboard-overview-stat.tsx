import { Link } from "@/i18n/navigation";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";

type Accent = "blue" | "green";

const ACCENT_STYLES: Record<
  Accent,
  { border: string; iconBg: string; iconText: string; ring: string }
> = {
  blue: {
    border: "border-l-[var(--accent)]",
    iconBg: "bg-[var(--accent)]/10",
    iconText: "text-[var(--accent)]",
    ring: "ring-[var(--accent)]/30",
  },
  green: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
  },
};

export function DashboardOverviewStat({
  href,
  label,
  value,
  icon,
  accent = "blue",
  active = false,
}: {
  href: string;
  label: string;
  value: number | string;
  icon: string;
  accent?: Accent;
  active?: boolean;
}): React.ReactElement {
  const styles = ACCENT_STYLES[accent];

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-sm transition hover:shadow-md sm:p-5",
        "border-l-4",
        styles.border,
        active && cn("ring-2", styles.ring),
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          styles.iconBg,
        )}
      >
        <MaterialIcon name={icon} className={cn("text-[26px]", styles.iconText)} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-[var(--label-primary)] sm:text-3xl">
          {value}
        </p>
        <p className="mt-0.5 text-sm font-medium text-[var(--label-secondary)]">{label}</p>
      </div>
    </Link>
  );
}
