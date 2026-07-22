"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";

const INCLUDED_KEYS = ["ssl", "migration", "backup", "support", "panel", "uptime"] as const;

export function HostingIncludedStrip(): React.ReactElement {
  const t = useTranslations("publicHosting");

  return (
    <section className="apple-page border-y border-[var(--separator)] py-12 sm:py-14">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <h2 className="mb-8 text-center text-xl font-semibold text-[var(--label)] sm:text-2xl">
          {t("includedTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-[14px] bg-[var(--bg-secondary)] px-4 py-3.5"
            >
              <MaterialIcon name="check_circle" className="shrink-0 text-[20px] text-[var(--accent)]" />
              <span className="text-sm text-[var(--label-secondary)]">{t(`included.${key}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
