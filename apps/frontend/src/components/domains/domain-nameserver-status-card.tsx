"use client";

import { useTranslations } from "next-intl";

import { DEFAULT_NAMESERVERS } from "./domain-nameservers-editor";

import { MaterialIcon } from "@/components/landing/material-icon";
import type { NameserverStatus } from "@/features/domains";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast-store";

export function DomainNameserverStatusCard({
  status,
  loading,
  onRefresh,
  translationScope = "domains",
}: {
  status: NameserverStatus | null;
  loading: boolean;
  onRefresh: () => void;
  translationScope?: "domains" | "hosting";
}): React.ReactElement {
  const t = useTranslations(
    translationScope === "hosting" ? "dashboard.pages.hosting" : "dashboard.pages.domains",
  );
  const requiredNameservers = status?.requiredNameservers.length
    ? status.requiredNameservers
    : DEFAULT_NAMESERVERS;
  const connected = status?.isUsingVexiraNameservers === true;
  const failed = status?.lookupStatus === "ERROR";

  const copyNameserver = async (nameserver: string) => {
    await navigator.clipboard.writeText(nameserver);
    toast(t("nsStatusCopied"), "success");
  };

  return (
    <section className="border-outline-variant/40 bg-surface relative overflow-hidden rounded-[24px] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.05)] sm:p-6">
      <div
        className="bg-primary/10 pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
            <MaterialIcon name="dns" className="text-[22px]" />
          </span>
          <div>
            <h2 className="text-on-surface text-lg font-semibold">{t("nsStatusTitle")}</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
              {t("nsStatusDescription")}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
            connected
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : failed
                ? "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          <MaterialIcon
            name={connected ? "verified" : failed ? "error" : "schedule"}
            className="text-[16px]"
          />
          {loading
            ? t("nsStatusChecking")
            : connected
              ? t("nsStatusConnected")
              : failed
                ? t("nsStatusError")
                : t("nsStatusPending")}
        </span>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-2">
        <div className="border-outline-variant/35 bg-surface-container-low rounded-2xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            {t("nsStatusRequired")}
          </p>
          <div className="mt-3 space-y-2">
            {requiredNameservers.map((nameserver, index) => (
              <div
                key={nameserver}
                className="border-outline-variant/30 bg-surface flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                    {index + 1}
                  </span>
                  <code className="text-on-surface truncate text-sm font-semibold">
                    {nameserver}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => void copyNameserver(nameserver)}
                  className="text-primary hover:bg-primary/10 inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition"
                >
                  <MaterialIcon name="content_copy" className="text-[15px]" />
                  {t("nsStatusCopy")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-outline-variant/35 bg-surface-container-low rounded-2xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            {t("nsStatusDetected")}
          </p>
          {status?.detectedNameservers.length ? (
            <div className="mt-3 space-y-2">
              {status.detectedNameservers.map((nameserver) => {
                const expected = requiredNameservers.includes(nameserver);
                return (
                  <div
                    key={nameserver}
                    className="border-outline-variant/30 bg-surface flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                  >
                    <MaterialIcon
                      name={expected ? "check_circle" : "warning"}
                      className={cn(
                        "text-[18px]",
                        expected ? "text-emerald-600" : "text-amber-600",
                      )}
                    />
                    <code className="text-on-surface truncate text-sm font-semibold">
                      {nameserver}
                    </code>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-outline-variant/50 text-on-surface-variant mt-3 flex min-h-[92px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm">
              {loading ? t("nsStatusChecking") : t("nsStatusDetectedEmpty")}
            </div>
          )}
        </div>
      </div>

      <div className="border-outline-variant/30 relative mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-on-surface-variant max-w-2xl text-xs leading-relaxed">
          {t("nsStatusPropagationHint")}
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          className="border-outline-variant/50 bg-surface text-on-surface hover:bg-surface-container-low inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:opacity-50"
        >
          <MaterialIcon name="refresh" className={cn("text-[17px]", loading && "animate-spin")} />
          {loading ? t("nsStatusChecking") : t("nsStatusRefresh")}
        </button>
      </div>
    </section>
  );
}
