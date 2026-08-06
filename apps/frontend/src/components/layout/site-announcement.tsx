"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const STORAGE_KEY = "vexira-site-announcement-dismiss";
const DISMISS_MS = 24 * 60 * 60 * 1000;

type Announcement = {
  enabled: boolean;
  title: string;
  message: string;
};

type DismissState = {
  fingerprint: string;
  dismissedAt: number;
};

function fingerprintOf(announcement: Announcement): string {
  return `${announcement.title}\n${announcement.message}`;
}

function readDismissState(): DismissState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissState;
    if (
      typeof parsed?.fingerprint !== "string" ||
      typeof parsed?.dismissedAt !== "number" ||
      !Number.isFinite(parsed.dismissedAt)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function shouldShow(announcement: Announcement): boolean {
  if (!announcement.enabled) return false;
  if (!announcement.message.trim()) return false;
  const dismissed = readDismissState();
  if (!dismissed) return true;
  if (dismissed.fingerprint !== fingerprintOf(announcement)) return true;
  return Date.now() - dismissed.dismissedAt >= DISMISS_MS;
}

export function SiteAnnouncement(): React.ReactElement | null {
  const t = useTranslations("announcement");
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const payload = (await res.json().catch(() => null)) as {
          data?: { announcement?: Announcement };
          announcement?: Announcement;
        } | null;
        const next = payload?.data?.announcement ?? payload?.announcement;
        if (!next || cancelled) return;
        const normalized: Announcement = {
          enabled: Boolean(next.enabled),
          title: typeof next.title === "string" ? next.title : "",
          message: typeof next.message === "string" ? next.message : "",
        };
        setAnnouncement(normalized);
        setOpen(shouldShow(normalized));
      } catch {
        // ignore — announcement is non-critical
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open || !announcement) return null;

  const title = announcement.title.trim() || t("defaultTitle");

  const handleClose = () => {
    try {
      const state: DismissState = {
        fingerprint: fingerprintOf(announcement),
        dismissedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage failures
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-[color-mix(in_srgb,var(--bg)_70%,transparent)] px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-announcement-title"
    >
      <div className="apple-card w-full max-w-md p-6 shadow-[var(--shadow-md)] sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
          <span className="material-symbols-outlined text-[26px] text-[var(--accent)]">
            campaign
          </span>
        </div>
        <h2
          id="site-announcement-title"
          className="text-center text-xl font-semibold tracking-tight text-[var(--label)]"
        >
          {title}
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-center text-[15px] leading-relaxed text-[var(--label-secondary)]">
          {announcement.message.trim()}
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="bg-primary text-on-primary mt-6 h-11 w-full rounded-2xl text-sm font-semibold transition hover:opacity-90"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
