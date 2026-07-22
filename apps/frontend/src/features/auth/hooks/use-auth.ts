"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";

export function useAuthHydration(): { isReady: boolean; isAuthenticated: boolean } {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return { isReady: sessionReady, isAuthenticated };
}

/** Ensures apiClient has the persisted bearer token before admin API calls. */
export function useAccessTokenReady(): boolean {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const accessToken = useAuthStore((s) => s.accessToken);

  return sessionReady && Boolean(accessToken);
}

export function useRequireAuth(redirectTo = "/login"): { isReady: boolean } {
  const { isReady, isAuthenticated } = useAuthHydration();

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isReady, isAuthenticated, redirectTo]);

  return { isReady };
}
