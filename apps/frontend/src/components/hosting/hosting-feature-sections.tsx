"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";

const BLOCKS = ["security", "performance", "scale", "migration"] as const;

const ICONS: Record<(typeof BLOCKS)[number], string> = {
  security: "shield_lock",
  performance: "speed",
  scale: "trending_up",
  migration: "sync_alt",
};

export function HostingFeatureSections(): React.ReactElement {
  const t = useTranslations("publicHosting");

  return (
    <div className="apple-grouped">
      {BLOCKS.map((key, index) => {
        const reversed = index % 2 === 1;
        return (
          <section
            key={key}
            className="border-b border-[var(--separator)] py-14 last:border-b-0 sm:py-16"
          >
            <div
              className={`mx-auto flex max-w-container-max flex-col gap-8 px-5 md:px-8 lg:items-center ${
                reversed ? "lg:flex-row-reverse" : "lg:flex-row"
              }`}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  {t(`blocks.${key}.title`)}
                </h2>
                <p className="mt-3 text-[17px] leading-relaxed text-[var(--label-secondary)]">
                  {t(`blocks.${key}.description`)}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {(["b1", "b2", "b3"] as const).map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-[var(--label-secondary)]"
                    >
                      <MaterialIcon name="check" className="mt-0.5 text-[16px] text-[var(--success)]" />
                      {t(`blocks.${key}.${bullet}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <div className="flex h-48 w-full max-w-sm items-center justify-center rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-apple-md">
                  <MaterialIcon name={ICONS[key]} className="text-[64px] text-[var(--accent)] opacity-80" />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
