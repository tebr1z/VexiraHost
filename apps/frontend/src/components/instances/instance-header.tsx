"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import { statusColor } from "@/features/servers";

interface InstanceHeaderProps {
  displayName: string;
  status: string;
  ipv4: string | null;
  regionLabel: string;
  onReboot?: () => void;
  onShutdown?: () => void;
  onStart?: () => void;
  powerLoading?: boolean;
}

export function InstanceHeader({
  displayName,
  status,
  ipv4,
  regionLabel,
  onReboot,
  onShutdown,
  onStart,
  powerLoading,
}: InstanceHeaderProps): React.ReactElement {
  const t = useTranslations("instances");
  const ts = useTranslations("ui.status");
  const colors = statusColor(status);
  const statusText = ts.has(status as "RUNNING") ? ts(status as "RUNNING") : status.replace(/_/g, " ");

  return (
    <div className="mb-stack-md flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
      <div className="flex items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-outline-variant/30 bg-white shadow-precision">
          <MaterialIcon name="dns" className="text-4xl text-secondary" />
        </div>
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="font-jakarta text-headline-lg font-bold text-primary">{displayName}</h1>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-geist text-label-sm capitalize ${colors.bg} ${colors.text}`}
            >
              <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
              {statusText}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-inter text-body-md text-on-surface-variant">
            <span className="flex items-center gap-1">
              <MaterialIcon name="public" className="text-sm" />
              {ipv4 ?? t("pendingIp")}
            </span>
            <span className="text-outline-variant">•</span>
            <span className="flex items-center gap-1">
              <MaterialIcon name="location_on" className="text-sm" />
              {regionLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low p-1.5 shadow-sm">
        <button
          type="button"
          disabled
          className="group relative rounded-xl p-3 text-on-surface-variant opacity-50 transition-all hover:bg-white"
          title={t("consoleSoon")}
        >
          <MaterialIcon name="terminal" />
          <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-primary px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {t("console")}
          </span>
        </button>
        {status === "STOPPED" && onStart ? (
          <button
            type="button"
            disabled={powerLoading}
            onClick={onStart}
            className="group relative rounded-xl p-3 text-on-surface-variant transition-all hover:bg-white hover:text-green-600 disabled:opacity-50"
          >
            <MaterialIcon name="play_arrow" />
            <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-primary px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {t("start")}
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={powerLoading || !onReboot}
              onClick={onReboot}
              className="group relative rounded-xl p-3 text-on-surface-variant transition-all hover:bg-white hover:text-secondary disabled:opacity-50"
            >
              <MaterialIcon name="restart_alt" />
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-primary px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {t("reboot")}
              </span>
            </button>
            <button
              type="button"
              disabled={powerLoading || !onShutdown}
              onClick={onShutdown}
              className="group relative rounded-xl p-3 text-on-surface-variant transition-all hover:bg-white hover:text-error disabled:opacity-50"
            >
              <MaterialIcon name="power_settings_new" />
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-primary px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {t("shutdown")}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
