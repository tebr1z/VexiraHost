"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { DomainSearch } from "./domain-search";
import { HeroShowcase } from "./hero-showcase";
import { MaterialIcon } from "./material-icon";

export function HeroSection(): React.ReactElement {
  const t = useTranslations("hero");

  const trustItems = [t("trust1"), t("trust2"), t("trust3")];
  const marqueeItems = (t.raw("marquee") as string[] | undefined) ?? trustItems;
  const marqueeLoop = [...marqueeItems, ...marqueeItems];

  return (
    <section className="hero-spectacle relative min-h-[calc(100vh-5rem)] overflow-hidden pb-10 pt-6 sm:pb-14 sm:pt-10">
      <div className="hero-spectacle-mesh pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-container-max px-5 md:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex max-w-fit items-center gap-2 rounded-full border-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-1.5 shadow-apple"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
          </span>
          <span className="text-xs font-medium text-[var(--label-secondary)]">{t("socialProof")}</span>
        </motion.div>

        <div className="mt-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]"
          >
            {t("badge")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mx-auto mt-4 max-w-4xl text-[clamp(2.5rem,7vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--label)]"
          >
            {t("titleLine1")}
            <span className="hero-gradient-text block sm:inline"> {t("titleLine2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="mx-auto mt-5 max-w-2xl text-[clamp(1.0625rem,2.5vw,1.3125rem)] leading-relaxed text-[var(--label-secondary)]"
          >
            {t("description")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="mt-3 text-[17px] font-medium text-[var(--label)]"
          >
            {t("highlight")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/register" className="apple-btn apple-btn-primary min-w-[11rem] px-8 py-3.5 text-base shadow-lg shadow-[color-mix(in_srgb,var(--accent)_25%,transparent)]">
              {t("startDeploying")}
            </Link>
            <a href="#pricing" className="apple-btn apple-btn-ghost min-w-[11rem] px-8 py-3.5 text-base">
              {t("viewDocs")}
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {trustItems.map((item, index) => (
              <li key={index} className="flex items-center gap-1.5 text-sm text-[var(--label-secondary)]">
                <MaterialIcon name="check_circle" className="text-[16px] text-[var(--success)]" />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <HeroShowcase />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="hero-marquee mt-6 overflow-hidden sm:mt-10"
        >
          <div className="hero-marquee-track flex gap-8 whitespace-nowrap text-sm font-medium text-[var(--label-tertiary)]">
            {marqueeLoop.map((item, i) => (
              <span key={`${item}-${i}`} className="inline-flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[var(--label-tertiary)]" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <DomainSearch />

      <motion.a
        href="#pricing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs text-[var(--label-tertiary)]"
      >
        <span>{t("scrollHint")}</span>
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="material-symbols-outlined text-base"
        >
          expand_more
        </motion.span>
      </motion.a>
    </section>
  );
}
