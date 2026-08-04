"use client";

import { motion } from "framer-motion";

import { MaterialIcon } from "@/components/landing/material-icon";
import { cn } from "@/lib/cn";

const GUARANTEE_ICONS = ["verified_user", "support_agent", "event_available"] as const;

export function PlansSectionIntro({
  eyebrow,
  title,
  subtitle,
  guarantees = [],
  controls,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  guarantees?: string[];
  controls?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("relative mb-10 sm:mb-12", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 -top-10 h-48 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35 }}
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]"
          >
            {eyebrow}
          </motion.p>
        ) : null}

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.04 }}
          className="apple-section-title text-balance"
        >
          {title}
        </motion.h2>

        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="apple-section-subtitle mx-auto mt-4 text-pretty"
          >
            {subtitle}
          </motion.p>
        ) : null}

        {guarantees.length > 0 ? (
          <motion.ul
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
          >
            {guarantees.map((item, index) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--separator)_85%,transparent)] bg-[color-mix(in_srgb,var(--bg-elevated)_88%,transparent)] px-3.5 py-2 text-[13px] font-medium text-[var(--label-secondary)] shadow-[0_1px_0_color-mix(in_srgb,white_35%,transparent)_inset] backdrop-blur-sm"
              >
                <MaterialIcon
                  name={GUARANTEE_ICONS[index % GUARANTEE_ICONS.length]}
                  className="text-[17px] text-[var(--accent)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </div>

      {controls ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="relative mt-8 flex justify-center"
        >
          <div className="inline-flex w-full max-w-xl flex-col items-center gap-3 rounded-[22px] border border-[color-mix(in_srgb,var(--separator)_80%,transparent)] bg-[color-mix(in_srgb,var(--bg-elevated)_82%,transparent)] px-4 py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] backdrop-blur-md sm:w-auto sm:flex-row sm:gap-4 sm:px-5">
            {controls}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
