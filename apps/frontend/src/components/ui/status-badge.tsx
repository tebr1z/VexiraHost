"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { isKnownStatus } from "@/lib/i18n/status";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  PROVISIONING: "bg-amber-100 text-amber-800 border-amber-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  SUSPENDED: "bg-orange-100 text-orange-800 border-orange-200",
  EXPIRED: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  CANCELLED: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  OPEN: "bg-blue-100 text-blue-800 border-blue-200",
  CLOSED: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  WAITING_CUSTOMER: "bg-amber-100 text-amber-800 border-amber-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  RUNNING: "bg-green-100 text-green-800 border-green-200",
  STOPPED: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  TRANSFER_PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  DRAFT: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  VOID: "bg-surface-container-high text-on-surface-variant border-outline-variant/40",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
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
  const style = STATUS_STYLES[key] ?? "bg-surface-container-low text-on-surface-variant border-outline-variant/40";
  const label = isKnownStatus(key) ? t(key) : status.replace(/_/g, " ").toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
