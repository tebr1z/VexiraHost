"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { MaterialIcon } from "./material-icon";

const NODES = [
  { id: "client", icon: "devices", labelKey: "nodeClient" as const },
  { id: "edge", icon: "hub", labelKey: "nodeEdge" as const },
  { id: "core", icon: "dns", labelKey: "nodeCore" as const },
  { id: "storage", icon: "database", labelKey: "nodeStorage" as const },
];

const METRICS_KEY = "vexira-data-transfer-metrics";
const DEFAULT_MBPS = 842;
const DEFAULT_PACKETS = 128_400;

type LiveMetrics = { mbps: number; packets: number; updatedAt: number };

function readMetrics(): LiveMetrics | null {
  try {
    const raw = sessionStorage.getItem(METRICS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveMetrics>;
    if (
      typeof parsed.mbps !== "number" ||
      typeof parsed.packets !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    return { mbps: parsed.mbps, packets: parsed.packets, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

function writeMetrics(metrics: LiveMetrics): void {
  try {
    sessionStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Catch up packets that would have accrued while the tab was closed. */
function catchUpPackets(saved: LiveMetrics, now = Date.now()): LiveMetrics {
  const elapsedMs = Math.max(0, now - saved.updatedAt);
  const ticks = Math.min(Math.floor(elapsedMs / 900), 8_000);
  const gained = ticks * 300;
  return {
    mbps: Math.round(Math.min(1240, Math.max(620, saved.mbps))),
    packets: saved.packets + gained,
    updatedAt: now,
  };
}

export function DataTransferSection(): React.ReactElement {
  const t = useTranslations("dataTransfer");
  const [mbps, setMbps] = useState(DEFAULT_MBPS);
  const [packets, setPackets] = useState(DEFAULT_PACKETS);
  const metricsRef = useRef<LiveMetrics>({
    mbps: DEFAULT_MBPS,
    packets: DEFAULT_PACKETS,
    updatedAt: 0,
  });

  useEffect(() => {
    const saved = readMetrics();
    const initial = saved
      ? catchUpPackets(saved)
      : { mbps: DEFAULT_MBPS, packets: DEFAULT_PACKETS, updatedAt: Date.now() };
    metricsRef.current = initial;
    setMbps(initial.mbps);
    setPackets(initial.packets);
    writeMetrics(initial);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      const prev = metricsRef.current;
      const nextMbps = Math.round(
        Math.min(1240, Math.max(620, prev.mbps + (Math.random() * 40 - 16))),
      );
      const nextPackets = prev.packets + Math.floor(180 + Math.random() * 420);
      const next: LiveMetrics = {
        mbps: nextMbps,
        packets: nextPackets,
        updatedAt: Date.now(),
      };
      metricsRef.current = next;
      writeMetrics(next);
      setMbps(nextMbps);
      setPackets(nextPackets);
    }, 900);

    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="apple-grouped overflow-hidden py-20 sm:py-28" id="solutions">
      <div className="max-w-container-max mx-auto px-5 md:px-8">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {t("eyebrow")}
          </p>
          <h2 className="apple-section-title">{t("title")}</h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("subtitle")}</p>
        </div>

        <div className="data-transfer-stage relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-[var(--separator)] bg-[var(--bg-elevated)] px-4 py-10 sm:px-8 sm:py-14">
          <div className="data-transfer-grid pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative z-[1]">
            <svg
              className="mx-auto h-[140px] w-full max-w-3xl sm:h-[180px]"
              viewBox="0 0 100 40"
              fill="none"
              aria-hidden
            >
              <path
                d="M8 20 H92"
                className="data-transfer-line"
                strokeWidth="0.35"
                strokeLinecap="round"
              />
              {[0, 1, 2, 3].map((i) => (
                <circle
                  key={`fwd-${i}`}
                  r="0.9"
                  className="data-transfer-packet data-transfer-packet-fwd"
                >
                  <animateMotion
                    dur="2.2s"
                    begin={`${i * 0.55}s`}
                    repeatCount="indefinite"
                    path="M8 20 H92"
                  />
                </circle>
              ))}
              {[0, 1, 2].map((i) => (
                <circle
                  key={`back-${i}`}
                  r="0.7"
                  className="data-transfer-packet data-transfer-packet-back"
                >
                  <animateMotion
                    dur="2.6s"
                    begin={`${0.35 + i * 0.7}s`}
                    repeatCount="indefinite"
                    path="M92 20 H8"
                  />
                </circle>
              ))}
            </svg>

            <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2 sm:gap-4">
              {NODES.map((node, index) => (
                <div key={node.id} className="flex flex-col items-center text-center">
                  <div
                    className="data-transfer-node mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] sm:h-14 sm:w-14"
                    style={{ animationDelay: `${index * 0.35}s` }}
                  >
                    <MaterialIcon
                      name={node.icon}
                      className="text-[22px] text-[var(--accent)] sm:text-[26px]"
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-[var(--label)] sm:text-sm">
                    {t(node.labelKey)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-4 text-center">
                <p className="data-transfer-metric text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  {mbps}
                  <span className="ml-1 text-sm font-medium text-[var(--label-tertiary)]">
                    Mbps
                  </span>
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{t("metricThroughput")}</p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-4 text-center">
                <p className="data-transfer-metric text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  {packets.toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{t("metricPackets")}</p>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-4 text-center">
                <p className="data-transfer-metric text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                  SSL
                </p>
                <p className="mt-1 text-xs text-[var(--label-tertiary)]">{t("metricSsl")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
