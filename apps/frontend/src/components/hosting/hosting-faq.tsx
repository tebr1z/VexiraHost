"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export function HostingFaq(): React.ReactElement {
  const t = useTranslations("publicHosting");
  const [open, setOpen] = useState<string | null>("q1");

  return (
    <section className="apple-page py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--label)] sm:text-3xl">
          {t("faqTitle")}
        </h2>
        <div className="divide-y divide-[var(--separator)] rounded-[16px] border border-[var(--separator)] bg-[var(--bg-elevated)]">
          {FAQ_KEYS.map((key) => {
            const isOpen = open === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-[var(--label)]">{t(`faq.${key}.question`)}</span>
                  <MaterialIcon
                    name={isOpen ? "expand_less" : "expand_more"}
                    className="shrink-0 text-[var(--label-tertiary)]"
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--label-secondary)]">
                    {t(`faq.${key}.answer`)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
