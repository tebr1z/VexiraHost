"use client";

import { motion, useReducedMotion } from "framer-motion";

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
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative mb-12 sm:mb-14", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-56"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 48% 70% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        {eyebrow ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35 }}
            className="mb-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]"
          >
            {eyebrow}
          </motion.p>
        ) : null}

        <motion.h2
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: 0.04 }}
          className="text-balance text-[clamp(1.85rem,4.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--label)]"
        >
          {title}
        </motion.h2>

        {subtitle ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="mx-auto mt-4 max-w-2xl text-pretty text-[clamp(0.98rem,2vw,1.125rem)] leading-relaxed text-[var(--label-secondary)]"
          >
            {subtitle}
          </motion.p>
        ) : null}

        {guarantees.length > 0 ? (
          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
          >
            {guarantees.map((item, index) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--label-secondary)]"
              >
                <MaterialIcon
                  name={GUARANTEE_ICONS[index % GUARANTEE_ICONS.length]}
                  className="text-[18px] text-[var(--accent)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </div>

      {controls ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="relative mt-10 flex justify-center"
        >
          {controls}
        </motion.div>
      ) : null}
    </div>
  );
}
