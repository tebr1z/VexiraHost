"use client";

import { motion } from "framer-motion";

import { MaterialIcon } from "@/components/landing/material-icon";
import { Link } from "@/i18n/navigation";

import { asString, asStringArray, CmsSectionShell } from "../cms-section-shell";
import type { PublicCmsSection } from "@/features/cms/types";

export function CmsHeroSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const c = section.content;
  const perks = asStringArray(c.perks);

  return (
    <CmsSectionShell design={section.design} className="relative overflow-hidden pb-10 pt-4 sm:pb-14">
      <div className="hero-spectacle-mesh pointer-events-none absolute inset-0 opacity-80" aria-hidden />
      <div className="relative mx-auto max-w-container-max px-5 text-center md:px-8">
        {asString(c.discountBadge) && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white"
          >
            {asString(c.discountBadge)}
          </motion.span>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-[clamp(2.25rem,6vw,3.5rem)] font-semibold leading-tight tracking-[-0.03em] text-[var(--label)]"
        >
          {asString(c.title)}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-4 max-w-2xl text-[clamp(1.125rem,2.5vw,1.375rem)] text-[var(--label-secondary)]"
        >
          {asString(c.subtitle)}
        </motion.p>
        {perks.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-2"
          >
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-[15px] text-[var(--label-secondary)]">
                <MaterialIcon name="check_circle" className="mt-0.5 shrink-0 text-[18px] text-[var(--success)]" />
                <span>{perk}</span>
              </li>
            ))}
          </motion.ul>
        )}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          {asString(c.ctaPrimary) && (
            <a
              href={asString(c.ctaPrimaryHref) || "#hosting-plans"}
              className="apple-btn apple-btn-primary min-w-[11rem] px-8"
            >
              {asString(c.ctaPrimary)}
            </a>
          )}
          {asString(c.ctaSecondary) && (
            <Link
              href={asString(c.ctaSecondaryHref) || "/register"}
              className="apple-btn apple-btn-ghost min-w-[11rem] px-8"
            >
              {asString(c.ctaSecondary)}
            </Link>
          )}
        </motion.div>
        {asString(c.moneyBack) && (
          <p className="mt-4 text-sm text-[var(--label-tertiary)]">{asString(c.moneyBack)}</p>
        )}
      </div>
    </CmsSectionShell>
  );
}
