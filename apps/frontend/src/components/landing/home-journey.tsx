"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { MaterialIcon } from "./material-icon";

import { Link } from "@/i18n/navigation";

const steps = [
  { icon: "category", titleKey: "step1Title", descriptionKey: "step1Description" },
  { icon: "tune", titleKey: "step2Title", descriptionKey: "step2Description" },
  { icon: "rocket_launch", titleKey: "step3Title", descriptionKey: "step3Description" },
] as const;

export function HomeJourney(): React.ReactElement {
  const t = useTranslations("homeJourney");
  const reduceMotion = useReducedMotion();

  return (
    <section className="apple-page py-20 sm:py-28" aria-labelledby="get-started-title">
      <div className="max-w-container-max mx-auto px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h2 id="get-started-title" className="apple-section-title">
            {t("title")}
          </h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("subtitle")}</p>
        </div>

        <ol className="relative mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-3 md:gap-6">
          <div
            className="absolute left-[16%] right-[16%] top-9 hidden h-px bg-[var(--separator)] md:block"
            aria-hidden
          />
          {steps.map((step, index) => (
            <motion.li
              key={step.titleKey}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="shadow-apple relative rounded-[24px] border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">
                <MaterialIcon name={step.icon} className="text-[24px]" />
              </div>
              <span className="absolute right-6 top-6 text-sm font-semibold tabular-nums text-[var(--label-tertiary)]">
                0{index + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-[var(--label)]">
                {t(step.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--label-secondary)]">
                {t(step.descriptionKey)}
              </p>
            </motion.li>
          ))}
        </ol>

        <div className="mt-8 text-center">
          <Link href="/register" className="apple-btn apple-btn-primary px-6 py-3">
            {t("cta")}
            <MaterialIcon name="arrow_forward" className="ml-1 text-[18px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
