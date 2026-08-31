"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { isKnownStatus } from "@/lib/i18n/status";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  PROVISIONING: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  SUSPENDED: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300",
  EXPIRED: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  CANCELLED: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  ERROR: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
  PAID: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  OPEN: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  CLOSED: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  FAILED: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
  REFUNDED: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  PROCESSING: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  IN_PROGRESS: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  WAITING_CUSTOMER: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  RESOLVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  RUNNING: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  SUCCESS: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  STOPPED: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  TRANSFER_PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
  DRAFT: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  SENT: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  SENDING: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  VOID: "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]",
  OVERDUE: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}): React.ReactElement {
  const t = useTranslations("ui.status");
  const key = status.toUpperCase();
  const style =
    STATUS_STYLES[key] ??
    "bg-[var(--fill-secondary)] text-[var(--label-secondary)] border-[var(--separator)]";
  const label = isKnownStatus(key) ? t(key) : status.replace(/_/g, " ").toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
