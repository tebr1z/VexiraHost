"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MaterialIcon } from "@/components/landing/material-icon";
import {
  getTenantResources,
  type TenantResources,
} from "@/features/hosting/services/hosting-deploy.service";

export function TenantResourcePanel({
  accountId,
  admin = false,
  initialLimits,
}: {
  accountId: string;
  admin?: boolean;
  initialLimits?: TenantResources["limits"];
}): React.ReactElement {
  const t = useTranslations("deployResources");
  const [measured, setData] = useState<TenantResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const data: TenantResources | null =
    measured ??
    (initialLimits
      ? {
          accountId,
          ready: false,
          mock: false,
          checkedAt: "",
          memoryBytes: null,
          diskBytes: null,
          cpuPercent: null,
          appliedCpuPercent: null,
          appliedMemoryMb: null,
          appliedDiskGb: null,
          limits: initialLimits,
        }
      : null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTenantResources(accountId, admin));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [accountId, admin]);

  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      if (!disposed && document.visibilityState === "visible") void load();
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const applied =
    !failed &&
    data?.ready &&
    data.appliedCpuPercent != null &&
    data.appliedMemoryMb != null &&
    data.appliedDiskGb != null;
  const pending = Boolean(
    applied &&
    (data!.appliedCpuPercent !== data!.limits.cpuPercent ||
      data!.appliedMemoryMb !== data!.limits.memoryMb ||
      data!.appliedDiskGb !== data!.limits.diskGb),
  );
  const metrics = data
    ? [
        {
          icon: "memory",
          title: "CPU",
          used: data.cpuPercent,
          max: data.appliedCpuPercent ?? data.limits.cpuPercent,
          suffix: "%",
          fraction: 1,
        },
        {
          icon: "developer_board",
          title: "RAM",
          used: data.memoryBytes == null ? null : Math.round(data.memoryBytes / 1024 ** 2),
          max: data.appliedMemoryMb ?? data.limits.memoryMb,
          suffix: "MB",
          fraction: 1,
        },
        {
          icon: "hard_drive",
          title: "SSD",
          used: data.diskBytes == null ? null : data.diskBytes / 1024 ** 3,
          max: data.appliedDiskGb ?? data.limits.diskGb,
          suffix: "GB",
          fraction: 2,
        },
      ]
    : [];

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--separator)] p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--label-primary)]">{t("title")}</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--label-secondary)]">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--separator)] px-3 text-xs font-semibold disabled:opacity-50"
        >
          <MaterialIcon
            name="refresh"
            className={loading ? "animate-spin text-base" : "text-base"}
          />
          {t("refresh")}
        </button>
      </div>
      {failed ? (
        <p
          role="alert"
          className="border-b border-[var(--separator)] px-5 py-3 text-xs text-[var(--danger)]"
        >
          {t("unavailable")}
        </p>
      ) : null}
      {!data ? (
        <p className="p-5 text-sm text-[var(--label-secondary)]" role="status">
          {t(failed ? "noMeasurements" : "loading")}
        </p>
      ) : (
        <>
          <div className="grid gap-px bg-[var(--separator)] sm:grid-cols-3">
            {metrics.map((metric) => {
              const percent =
                metric.used == null ? 0 : Math.min(100, (metric.used / metric.max) * 100);
              const known = !failed && data.ready && !data.mock && metric.used != null;
              return (
                <div key={metric.title} className="bg-[var(--bg-elevated)] p-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--label-secondary)]">
                    <span>{metric.title}</span>
                    <MaterialIcon name={metric.icon} className="text-lg" />
                  </div>
                  <p className="mt-4 flex flex-wrap items-baseline gap-1.5">
                    <strong className="text-2xl font-bold tabular-nums">
                      {known
                        ? metric.used!.toLocaleString(undefined, {
                            maximumFractionDigits: metric.fraction,
                          })
                        : "—"}
                    </strong>
                    <span className="text-xs text-[var(--label-secondary)]">
                      / {metric.max} {metric.suffix}
                    </span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={metric.title}
                    aria-valuemin={0}
                    aria-valuemax={metric.max}
                    aria-valuenow={known ? metric.used! : undefined}
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]"
                  >
                    <div
                      className={
                        percent >= 90
                          ? "h-full rounded-full bg-amber-500"
                          : "h-full rounded-full bg-[var(--accent)]"
                      }
                      style={{ width: `${known ? percent : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[var(--separator)] p-4 text-xs leading-5 text-[var(--label-secondary)]">
            <p
              className={
                applied && !pending
                  ? "font-semibold text-emerald-700 dark:text-emerald-300"
                  : "font-semibold text-amber-700 dark:text-amber-300"
              }
            >
              {data.mock
                ? t("mock")
                : data.hasDeployments === false
                  ? t("empty")
                  : !applied
                    ? t("notPrepared")
                    : pending
                      ? t("pending")
                      : t("enforced")}
            </p>
            {pending ? (
              <p>
                {t("configured", {
                  cpu: data.limits.cpuPercent,
                  ram: data.limits.memoryMb,
                  disk: data.limits.diskGb,
                })}
              </p>
            ) : null}
            <p className="mt-1">{t("storageHint")}</p>
          </div>
        </>
      )}
    </section>
  );
}
