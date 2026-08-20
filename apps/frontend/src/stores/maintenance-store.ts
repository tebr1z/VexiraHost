"use client";

import { create } from "zustand";

import { parseLocalizedText, type LocalizedText } from "@/lib/localized-text";
import { defaultSiteAccess, parseSiteAccess, type SiteAccessConfig } from "@/lib/site-access";

export interface TurnstilePublicConfig {
  ready: boolean;
  enabled: boolean;
  siteKey: string;
}

interface MaintenanceState {
  manualEnabled: boolean;
  /** Backend unreachable or returned a server/network error. */
  apiUnavailable: boolean;
  /** Custom message from admin; empty means use i18n default on UI. */
  message: LocalizedText;
  turnstile: TurnstilePublicConfig;
  access: SiteAccessConfig;
  setManual: (enabled: boolean, message?: unknown) => void;
  setApiUnavailable: (active: boolean) => void;
  setTurnstile: (config: { enabled: boolean; siteKey: string }) => void;
  setAccess: (access: unknown) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  manualEnabled: false,
  apiUnavailable: false,
  message: { az: "", en: "", tr: "", ru: "" },
  turnstile: { ready: false, enabled: false, siteKey: "" },
  access: defaultSiteAccess(),
  setManual: (enabled, message) =>
    set({
      manualEnabled: enabled,
      message: parseLocalizedText(message),
    }),
  setApiUnavailable: (active) => set({ apiUnavailable: active }),
  setTurnstile: (config) =>
    set({
      turnstile: {
        ready: true,
        enabled: Boolean(config.enabled && config.siteKey),
        siteKey: config.siteKey,
      },
    }),
  setAccess: (access) => set({ access: parseSiteAccess(access) }),
}));
