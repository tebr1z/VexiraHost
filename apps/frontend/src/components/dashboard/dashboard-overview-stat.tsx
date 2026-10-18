"use client";

import { MaterialIcon } from "@/components/landing/material-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Accent = "blue" | "violet" | "cyan" | "amber" | "emerald";

const ACCENT_STYLES: Record<Accent, { border: string; iconBg: string; iconText: string }> = {
  blue: {
    border: "border-t-[var(--accent)]",
    iconBg: "bg-[var(--accent)]/10",
    iconText: "text-[var(--accent)]",
  },
  violet: {
    border: "border-t-violet-500",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-600 dark:text-violet-400",
  },
  cyan: {
    border: "border-t-cyan-500",
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-600 dark:text-cyan-400",
  },
  amber: {
    border: "border-t-amber-500",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  emerald: {
    border: "border-t-emerald-500",
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
  delay?: number;
}): React.ReactElement {
  const styles = ACCENT_STYLES[accent];

  return (
    <Link
      href={href}
      className={cn(
        "vexira-overview-card group relative flex min-h-[126px] overflow-hidden rounded-[16px] border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 transition-colors hover:border-[var(--accent)]",
      )}
    >
      <div className="relative z-10 flex w-full items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
            {label}
          </p>
          <p className="mt-3 truncate text-[2rem] font-bold tabular-nums tracking-[-0.035em] text-[var(--label-primary)]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            styles.iconBg,
          )}
        >
          <MaterialIcon name={icon} className={cn("text-[24px]", styles.iconText)} />
        </div>
      </div>
      <span className="absolute bottom-3 right-4 translate-x-1 text-[var(--label-tertiary)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        <MaterialIcon name="arrow_forward" className="text-[18px]" />
      </span>
    </Link>
  );
}
