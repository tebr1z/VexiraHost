"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { useMaintenanceStore } from "@/stores/maintenance-store";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const HEALTH_POLL_MS = 15_000;

export function MaintenanceGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const t = useTranslations("maintenance");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const manualEnabled = useMaintenanceStore((s) => s.manualEnabled);
  const apiUnavailable = useMaintenanceStore((s) => s.apiUnavailable);
  const message = useMaintenanceStore((s) => s.message);
  const setManual = useMaintenanceStore((s) => s.setManual);
  const setApiUnavailable = useMaintenanceStore((s) => s.setApiUnavailable);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 6_000);
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });
        window.clearTimeout(timer);
        if (cancelled) return;

        if (!res.ok) {
          setApiUnavailable(true);
          return;
        }

        const payload = (await res.json().catch(() => null)) as {
          data?: { maintenance?: { enabled?: boolean; message?: string } };
          maintenance?: { enabled?: boolean; message?: string };
        } | null;
        const maintenance = payload?.data?.maintenance ?? payload?.maintenance;
        setManual(Boolean(maintenance?.enabled), maintenance?.message ?? "");
        setApiUnavailable(false);
      } catch {
        if (!cancelled) setApiUnavailable(true);
      }
    };

    void poll();
    const id = window.setInterval(poll, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setManual, setApiUnavailable]);

  const showOverlay = useMemo(() => {
    if (isAdmin) return false;
    return manualEnabled || apiUnavailable;
  }, [isAdmin, manualEnabled, apiUnavailable]);

  if (!showOverlay) {
    return <>{children}</>;
  }

  const title = apiUnavailable && !manualEnabled ? t("slowTitle") : t("title");
  const body =
    apiUnavailable && !manualEnabled
      ? t("slowDescription")
      : message.trim() || t("description");

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none select-none blur-[2px] opacity-40" aria-hidden>
        {children}
      </div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] px-4 backdrop-blur-md">
        <div className="apple-card w-full max-w-lg p-8 text-center shadow-[var(--shadow-md)]">
          <div className="mb-6 flex justify-center">
            <BrandLogo />
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
            <span className="material-symbols-outlined text-[28px] text-[var(--accent)]">
              construction
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--label)]">{title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--label-secondary)]">{body}</p>
        </div>
      </div>
    </div>
  );
}
