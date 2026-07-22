import type { AuthSession } from "@vexira/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { apiClient } from "@/services/api-client";
import { useImpersonationStore } from "@/stores/impersonation-store";

interface AuthState {
  user: AuthSession["user"] | null;
  accessToken: string | null;
  refreshToken: string | null;
  rememberMe: boolean;
  isAuthenticated: boolean;
  sessionReady: boolean;
  setSession: (session: AuthSession, options?: { rememberMe?: boolean }) => void;
  clearSession: () => void;
  hydrateToken: () => void;
  setSessionReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      rememberMe: false,
      isAuthenticated: false,
      sessionReady: false,
      setSession: (session, options) => {
        const rememberMe = options?.rememberMe ?? get().rememberMe;
        apiClient.setAccessToken(session.tokens.accessToken);
        set({
          user: session.user,
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          rememberMe,
          isAuthenticated: true,
        });
      },
      clearSession: () => {
        useImpersonationStore.getState().clearImpersonation();
        apiClient.setAccessToken("");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          rememberMe: false,
          isAuthenticated: false,
        });
      },
      hydrateToken: () => {
        const token = get().accessToken;
        if (token) {
          apiClient.setAccessToken(token);
        }
      },
      setSessionReady: (ready) => set({ sessionReady: ready }),
    }),
    {
      name: "vexira-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        rememberMe: state.rememberMe,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          apiClient.setAccessToken(state.accessToken);
        }
      },
    },
  ),
);

/** Client-only: wait for zustand persist rehydration (SSR-safe). */
export function onAuthStoreHydrated(callback: () => void): (() => void) | void {
  if (typeof window === "undefined") return;

  const persistApi = useAuthStore.persist;
  if (!persistApi?.hasHydrated) {
    callback();
    return;
  }

  if (persistApi.hasHydrated()) {
    callback();
    return;
  }

  return persistApi.onFinishHydration(callback);
}
