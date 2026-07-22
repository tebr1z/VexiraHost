"use client";

import { create } from "zustand";

interface MaintenanceState {
  manualEnabled: boolean;
  /** Backend unreachable or returned a server/network error. */
  apiUnavailable: boolean;
  /** Custom message from admin; empty means use i18n default on UI. */
  message: string;
  setManual: (enabled: boolean, message?: string) => void;
  setApiUnavailable: (active: boolean) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  manualEnabled: false,
  apiUnavailable: false,
  message: "",
  setManual: (enabled, message) =>
    set({
      manualEnabled: enabled,
      message: typeof message === "string" ? message.trim() : "",
    }),
  setApiUnavailable: (active) => set({ apiUnavailable: active }),
}));
