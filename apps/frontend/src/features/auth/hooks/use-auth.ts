"use client";

import { useEffect, useState } from "react";

import { fetchProfile } from "@/features/auth/services/auth.service";
import { isStaffRole } from "@/lib/is-staff-role";
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
      const next = `${window.location.pathname}${window.location.search}`;
      const sep = redirectTo.includes("?") ? "&" : "?";
      window.location.href = `${redirectTo}${sep}next=${encodeURIComponent(next)}`;
    }
  }, [isReady, isAuthenticated, redirectTo]);

  return { isReady };
}

/**
 * Confirms staff access from /users/me after persist hydrate.
 * localStorage role is never trusted for the admin UI.
 */
export function useVerifiedStaffSession(): { isReady: boolean; isStaff: boolean } {
  const sessionReady = useAuthStore((s) => s.sessionReady);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const [verified, setVerified] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;

    if (!accessToken) {
      setIsStaff(false);
      setVerified(true);
      return;
    }

    let cancelled = false;
    setVerified(false);

    const finish = (staff: boolean) => {
      if (cancelled) return;
      setIsStaff(staff);
      setVerified(true);
    };

    const timeout = window.setTimeout(() => finish(false), 12_000);

    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        setUser(profile);
        finish(isStaffRole(profile.role));
      })
      .catch(() => {
        window.clearTimeout(timeout);
        finish(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [sessionReady, accessToken, setUser]);

  return { isReady: sessionReady && verified, isStaff };
}
