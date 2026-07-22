"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { MaterialIcon } from "./material-icon";

const CARD_OFFSETS = [
  { rotate: -6, x: -90, y: 12, delay: 0.35, z: 20 },
  { rotate: 0, x: 0, y: 0, delay: 0.45, z: 30 },
  { rotate: 5, x: 90, y: 14, delay: 0.55, z: 20 },
];

export function HeroShowcase(): React.ReactElement {
  const t = useTranslations("hero");

  const cards = [
    {
      icon: "dns",
      title: t("showcaseHosting"),
      metric: "99.99%",
      sub: t("statUptime"),
      accent: "var(--accent)",
      progress: "99%",
    },
    {
      icon: "cloud",
      title: t("showcaseVps"),
      metric: "NVMe",
      sub: t("statStorage"),
      accent: "#5856d6",
      progress: "86%",
    },
    {
      icon: "dashboard",
      title: t("showcasePanel"),
      metric: t("showcaseLive"),
      sub: t("showcaseLatency"),
      accent: "#34c759",
      progress: "72%",
    },
  ];

  return (
    <div className="relative mx-auto mt-12 hidden h-[280px] max-w-3xl sm:block lg:h-[300px]">
      <div className="absolute inset-x-12 top-1/2 h-36 -translate-y-1/2 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />

      {cards.map((card, index) => {
        const offset = CARD_OFFSETS[index]!;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 48 }}
            animate={{
              opacity: 1,
              y: [offset.y, offset.y - 10, offset.y],
              x: offset.x,
              rotate: [offset.rotate, offset.rotate + 1, offset.rotate],
            }}
            transition={{
              opacity: { duration: 0.5, delay: offset.delay },
              y: { duration: 5 + index, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 6 + index, repeat: Infinity, ease: "easeInOut" },
              x: { duration: 0.5, delay: offset.delay },
            }}
            className="absolute left-1/2 top-1/2 w-[210px] -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: offset.z }}
          >
            <div className="overflow-hidden rounded-[22px] border-[0.5px] border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-apple-md">
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${card.accent} 14%, transparent)` }}
                >
                  <span style={{ color: card.accent }}>
                    <MaterialIcon name={card.icon} className="text-[20px]" />
                  </span>
                </span>
                {index === 1 && (
                  <span className="rounded-full bg-[var(--success)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t("showcaseLive")}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[var(--label)]">{card.title}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--label)]">{card.metric}</p>
              <p className="text-xs text-[var(--label-tertiary)]">{card.sub}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--fill-secondary)]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: card.accent }}
                  initial={{ width: "0%" }}
                  animate={{ width: card.progress }}
                  transition={{ duration: 1.2, delay: offset.delay + 0.2, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
