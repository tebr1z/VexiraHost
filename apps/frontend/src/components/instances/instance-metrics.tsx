"use client";

import { useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import type { ServerMetrics } from "@/features/servers";

interface InstanceMetricsProps {
  metrics: ServerMetrics;
}

export function InstanceMetrics({ metrics }: InstanceMetricsProps): React.ReactElement {
  const tm = useTranslations("instances.metrics");
  const ramPercent = Math.round((metrics.ramUsedGb / metrics.ramTotalGb) * 100);
  const strokeOffset = 301.59 - (301.59 * metrics.diskIops) / 150;

  return (
    <div className="mb-stack-md grid grid-cols-1 gap-gutter md:grid-cols-3">
      <div className="glass-card relative overflow-hidden rounded-2xl border border-outline-variant/20 p-stack-md shadow-precision">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 font-geist text-label-sm uppercase tracking-wider text-outline">
              {tm("cpuLoad")}
            </p>
            <h3 className="font-jakarta text-headline-lg font-bold">
              {metrics.cpuPercent.toFixed(1)}%
            </h3>
          </div>
          <div
            className={`font-geist text-label-sm font-semibold ${
              metrics.cpuTrend >= 0 ? "text-green-500" : "text-error"
            }`}
          >
            {metrics.cpuTrend >= 0 ? "+" : ""}
            {metrics.cpuTrend.toFixed(1)}%
          </div>
        </div>
        <div className="flex h-32 items-end gap-1">
          {metrics.cpuHistory.map((height, index) => (
            <div
              key={index}
              className={`flex-1 rounded-t-sm bg-secondary/10 transition-colors hover:bg-secondary/20 ${
                index === metrics.cpuHistory.length - 1
                  ? "border-t-2 border-secondary bg-secondary/20"
                  : ""
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl border border-outline-variant/20 p-stack-md shadow-precision">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 font-geist text-label-sm uppercase tracking-wider text-outline">
              {tm("ramUsage")}
            </p>
            <h3 className="font-jakarta text-headline-lg font-bold">
              {metrics.ramUsedGb.toFixed(1)} GB{" "}
              <span className="text-body-md font-normal text-outline">/ {metrics.ramTotalGb}GB</span>
            </h3>
          </div>
          <div className="font-geist text-label-sm font-semibold text-on-surface-variant">
            {ramPercent}%
          </div>
        </div>
        <div className="flex h-32 flex-col justify-end">
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_15px_rgba(0,0,0,0.1)]"
              style={{ width: `${ramPercent}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between font-geist text-label-sm text-on-surface-variant">
            <span>{tm("buffered", { value: metrics.ramBufferedGb.toFixed(1) })}</span>
            <span>{tm("cache", { value: metrics.ramCacheGb.toFixed(1) })}</span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-outline-variant/20 p-stack-md shadow-precision">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-1 font-geist text-label-sm uppercase tracking-wider text-outline">
              {tm("diskIo")}
            </p>
            <h3 className="font-jakarta text-headline-lg font-bold">
              {metrics.diskIoMbps} MB/s
            </h3>
          </div>
          <div className="flex items-center gap-1 font-geist text-label-sm font-semibold text-secondary">
            <MaterialIcon name="trending_up" className="text-sm" />
            {tm("peak")}
          </div>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="relative h-28 w-28">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 112 112">
              <circle
                className="text-surface-container"
                cx="56"
                cy="56"
                fill="transparent"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
              />
              <circle
                className="text-secondary"
                cx="56"
                cy="56"
                fill="transparent"
                r="48"
                stroke="currentColor"
                strokeDasharray="301.59"
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-headline-lg font-bold">{metrics.diskIops}</span>
              <span className="text-[10px] uppercase text-outline">{tm("iops")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
