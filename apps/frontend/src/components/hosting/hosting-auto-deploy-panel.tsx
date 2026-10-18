"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { HostingDeploySection } from "./hosting-deploy-section";
import { TenantResourcePanel } from "./tenant-resource-panel";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";

type AppType = "NEXTJS" | "NESTJS" | "DOTNET" | "REACT" | "NODEJS";

const APP_TYPES: Array<{ id: AppType; icon: string; runtime: "PM2" | "Docker" | "Plesk" }> = [
  { id: "NEXTJS", icon: "web", runtime: "PM2" },
  { id: "NESTJS", icon: "api", runtime: "PM2" },
  { id: "DOTNET", icon: "deployed_code", runtime: "Docker" },
  { id: "REACT", icon: "code", runtime: "Plesk" },
  { id: "NODEJS", icon: "terminal", runtime: "Plesk" },
];

export function HostingAutoDeployPanel({
  accountId,
  primaryDomain,
  panelLoading,
  onPanelLogin,
  limits,
}: {
  accountId: string;
  primaryDomain: string;
  panelLoading: boolean;
  onPanelLogin: () => void;
  limits?: {
    diskGb: number;
    maxApps: number;
    aiCredits: number;
    cpuPercent?: number;
    memoryMb?: number;
  };
  diskUsedMb?: number;
}): React.ReactElement {
  const t = useTranslations("dashboard.pages.hosting.deploy");
  const [appType, setAppType] = useState<AppType>("NEXTJS");
  const selected = APP_TYPES.find((item) => item.id === appType)!;
  const managedByPlesk = appType === "REACT" || appType === "NODEJS";

  return (
    <div className="space-y-5">
      <TenantResourcePanel
        key={accountId}
        accountId={accountId}
        initialLimits={
          limits
            ? {
                cpuPercent: limits.cpuPercent ?? 100,
                memoryMb: limits.memoryMb ?? 1024,
                diskGb: limits.diskGb,
                maxApps: limits.maxApps,
              }
            : undefined
        }
      />
      {limits ? (
        <div className="flex flex-wrap gap-3 text-xs text-[var(--label-secondary)]">
          <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 py-3 text-sm">
            <span className="text-[var(--label-secondary)]">{t("quotaApps")}</span>{" "}
            <strong>{limits.maxApps}</strong>
          </div>
          <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 py-3 text-sm">
            <span className="text-[var(--label-secondary)]">{t("quotaAi")}</span>{" "}
            <strong>{limits.aiCredits}</strong>
          </div>
        </div>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm">
        <div className="border-b border-[var(--separator)] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                  <MaterialIcon name="rocket_launch" className="text-[19px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[var(--label-primary)]">
                    {t("simpleTitle")}
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--label-secondary)]">
                    {t("simpleDescription")}
                  </p>
                </div>
              </div>
            </div>
            <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--label-secondary)]">
              {t("runtimeLabel")}: {selected.runtime}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-5 sm:p-4">
          {APP_TYPES.map((item) => {
            const active = item.id === appType;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setAppType(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition sm:flex-col sm:items-start",
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    : "border-[var(--separator)] bg-[var(--bg-secondary)] hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--separator))]",
                )}
              >
                <MaterialIcon
                  name={item.icon}
                  className={cn(
                    "text-[20px]",
                    active ? "text-[var(--accent)]" : "text-[var(--label-tertiary)]",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--label-primary)]">
                    {t(`appType_${item.id}`)}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
                    {item.runtime}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {managedByPlesk ? (
        <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 text-center shadow-sm sm:p-7">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
            <MaterialIcon name="space_dashboard" className="text-[24px]" />
          </span>
          <h3 className="mt-3 text-base font-bold text-[var(--label-primary)]">
            {t("pleskDeployTitle", { app: t(`appType_${appType}`) })}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--label-secondary)]">
            {t(appType === "REACT" ? "pleskReactHint" : "pleskNodeHint")}
          </p>
          <button
            type="button"
            disabled={panelLoading}
            onClick={onPanelLogin}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <MaterialIcon name="open_in_new" className="text-[18px]" />
            {panelLoading ? t("openingPlesk") : t("openPlesk")}
          </button>
        </section>
      ) : (
        <HostingDeploySection
          key={appType}
          accountId={accountId}
          primaryDomain={primaryDomain}
          enabled
          embedded
          variant={appType === "DOTNET" ? "docker" : "git"}
          fixedStack={appType}
        />
      )}
    </div>
  );
}
