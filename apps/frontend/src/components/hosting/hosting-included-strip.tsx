"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";

const INCLUDED = [
  { key: "ssl", icon: "lock" },
  { key: "migration", icon: "sync_alt" },
  { key: "backup", icon: "cloud_sync" },
  { key: "support", icon: "support_agent" },
  { key: "panel", icon: "dashboard" },
  { key: "uptime", icon: "verified" },
  { key: "webmail", icon: "mail" },
  { key: "wordpress", icon: "language" },
] as const;

export function HostingIncludedStrip(): React.ReactElement {
  const t = useTranslations("publicHosting");

  return (
    <section className="apple-page border-y border-[var(--separator)] py-12 sm:py-14">
      <div className="max-w-container-max mx-auto px-5 md:px-8">
        <h2 className="mb-8 text-center text-xl font-semibold text-[var(--label)] sm:text-2xl">
          {t("includedTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDED.map((item) => (
            <div
              key={item.key}
              className="flex items-start gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--separator)_70%,transparent)] bg-[color-mix(in_srgb,var(--bg-elevated)_90%,transparent)] px-4 py-3.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                <MaterialIcon name={item.icon} className="text-[22px] text-[var(--accent)]" />
              </span>
              <span className="pt-2 text-sm text-[var(--label-secondary)]">
                {t(`included.${item.key}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
