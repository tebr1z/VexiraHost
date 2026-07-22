"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "./material-icon";

const TESTIMONIAL_KEYS = ["sarah", "marcus"] as const;

export function TestimonialsSection(): React.ReactElement {
  const t = useTranslations("testimonials");

  return (
    <section className="apple-grouped py-20 sm:py-28" id="solutions">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <div className="mb-12 text-center">
          <h2 className="apple-section-title">{t("title")}</h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {TESTIMONIAL_KEYS.map((key) => (
            <article key={key} className="apple-card p-6 sm:p-8">
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <MaterialIcon
                    key={i}
                    name="star"
                    filled
                    className="text-[16px] text-[var(--accent)]"
                  />
                ))}
              </div>
              <blockquote className="text-[17px] leading-relaxed text-[var(--label-secondary)]">
                &ldquo;{t(`items.${key}.quote`)}&rdquo;
              </blockquote>
              <footer className="mt-6">
                <p className="font-semibold text-[var(--label)]">{t(`items.${key}.author`)}</p>
                <p className="text-sm text-[var(--label-tertiary)]">{t(`items.${key}.role`)}</p>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
