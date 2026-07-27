"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "./material-icon";

/** Approximate PoP positions on a 1000×460 world projection */
const POPS = [
  { id: "nyc", cx: 248, cy: 168, ping: "12ms" },
  { id: "fra", cx: 512, cy: 142, ping: "8ms" },
  { id: "ams", cx: 498, cy: 128, ping: "9ms" },
  { id: "ist", cx: 575, cy: 168, ping: "11ms" },
  { id: "dxb", cx: 628, cy: 210, ping: "14ms" },
  { id: "sgp", cx: 760, cy: 268, ping: "18ms" },
  { id: "tyo", cx: 842, cy: 168, ping: "22ms" },
  { id: "syd", cx: 880, cy: 340, ping: "28ms" },
  { id: "sao", cx: 320, cy: 310, ping: "24ms" },
  { id: "lax", cx: 148, cy: 190, ping: "16ms" },
] as const;

const ROUTES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [0, 9],
  [0, 8],
  [2, 5],
  [1, 6],
];

export function InfrastructureSection(): React.ReactElement {
  const t = useTranslations("infra");

  return (
    <section className="apple-page overflow-hidden py-20 sm:py-28" id="infrastructure">
      <div className="max-w-container-max mx-auto px-5 md:px-8">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h2 className="apple-section-title">{t("networkTitle")}</h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("networkDesc")}</p>
        </div>

        <div className="infra-network-stage relative overflow-hidden rounded-[28px] border border-[var(--separator)] bg-[var(--bg-elevated)]">
          <div className="infra-network-aurora pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative z-[1] px-3 pb-4 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
            <div
              className="relative mx-auto aspect-[1000/460] w-full max-w-4xl"
              role="img"
              aria-label={t("mapAlt")}
            >
              <svg viewBox="0 0 1000 460" className="h-full w-full" fill="none">
                {/* Soft landmass silhouettes */}
                <g className="infra-land" opacity="0.35">
                  <ellipse cx="220" cy="180" rx="120" ry="70" />
                  <ellipse cx="300" cy="300" rx="70" ry="90" />
                  <ellipse cx="520" cy="150" rx="90" ry="55" />
                  <ellipse cx="580" cy="210" rx="55" ry="40" />
                  <ellipse cx="720" cy="200" rx="100" ry="70" />
                  <ellipse cx="800" cy="280" rx="50" ry="35" />
                  <ellipse cx="860" cy="340" rx="55" ry="30" />
                  <ellipse cx="480" cy="320" rx="70" ry="45" />
                </g>

                {/* Route arcs */}
                {ROUTES.map(([a, b], i) => {
                  const from = POPS[a]!;
                  const to = POPS[b]!;
                  const midX = (from.cx + to.cx) / 2;
                  const midY = Math.min(from.cy, to.cy) - 28 - (i % 3) * 10;
                  return (
                    <g key={`${from.id}-${to.id}`}>
                      <path
                        d={`M${from.cx} ${from.cy} Q ${midX} ${midY} ${to.cx} ${to.cy}`}
                        className="infra-route"
                        strokeWidth="1.25"
                      />
                      <circle r="2.2" className="infra-pulse">
                        <animateMotion
                          dur={`${2.4 + (i % 4) * 0.35}s`}
                          begin={`${i * 0.28}s`}
                          repeatCount="indefinite"
                          path={`M${from.cx} ${from.cy} Q ${midX} ${midY} ${to.cx} ${to.cy}`}
                        />
                      </circle>
                    </g>
                  );
                })}

                {/* PoP nodes — avoid SVG <title>: it hydrates as HTML <title> and mismatches */}
                {POPS.map((pop, i) => (
                  <g key={pop.id} aria-label={`${pop.id.toUpperCase()} ${pop.ping}`}>
                    <circle
                      cx={pop.cx}
                      cy={pop.cy}
                      r="14"
                      className="infra-pop-ring"
                      style={{ animationDelay: `${i * 0.22}s` }}
                    />
                    <circle cx={pop.cx} cy={pop.cy} r="4.5" className="infra-pop-core" />
                  </g>
                ))}
              </svg>
            </div>

            <div className="mx-auto mt-2 flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2 text-xs text-[var(--label-tertiary)] sm:mt-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {t("legendActive")}
              </span>
              <span>{t("legendRoutes")}</span>
            </div>
          </div>

          <div className="relative z-[1] grid grid-cols-2 divide-x divide-y divide-[var(--separator)] border-t border-[var(--separator)] sm:grid-cols-4 sm:divide-y-0">
            {[
              { value: "99.99%", label: t("uptimeSla") },
              { value: "24+", label: t("popsLabel") },
              { value: "10ms", label: t("latencyLabel") },
              { value: "120TB", label: t("coreBackbone") },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-5 text-center">
                <p className="text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
              <MaterialIcon name="shield_lock" className="text-[22px] text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--label)]">{t("guardTitle")}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                  {t("secure")}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">
                {t("guardDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
              <MaterialIcon name="speed" className="text-[22px] text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[var(--label)]">{t("fasterTitle")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">
                {t("fasterDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
