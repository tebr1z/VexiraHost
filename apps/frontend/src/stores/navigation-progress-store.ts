"use client";

import { create } from "zustand";

interface NavigationProgressState {
  isActive: boolean;
  showOverlay: boolean;
  progress: number;
  start: () => void;
  complete: () => void;
}

let progressTimer: ReturnType<typeof setInterval> | null = null;
let overlayTimer: ReturnType<typeof setTimeout> | null = null;
let completeTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers(): void {
  if (progressTimer) clearInterval(progressTimer);
  if (overlayTimer) clearTimeout(overlayTimer);
  if (completeTimer) clearTimeout(completeTimer);
  progressTimer = null;
  overlayTimer = null;
  completeTimer = null;
}

export const useNavigationProgressStore = create<NavigationProgressState>((set, get) => ({
  isActive: false,
  showOverlay: false,
  progress: 0,

  start: () => {
    clearTimers();
    set({ isActive: true, showOverlay: false, progress: 12 });

    overlayTimer = setTimeout(() => {
      if (get().isActive) {
        set({ showOverlay: true });
      }
    }, 180);

    progressTimer = setInterval(() => {
      set((state) => ({
        progress: Math.min(state.progress + 4 + Math.random() * 10, 92),
      }));
    }, 320);
  },

  complete: () => {
    if (!get().isActive) return;
    clearTimers();
    set({ progress: 100 });

    completeTimer = setTimeout(() => {
      set({ isActive: false, showOverlay: false, progress: 0 });
    }, 320);
  },
}));
