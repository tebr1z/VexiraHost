"use client";

import { useEffect } from "react";

import { ensureValidAccessToken } from "@/features/auth/services/auth-session.service";
import { onAuthStoreHydrated, useAuthStore } from "@/stores/auth-store";

const BOOTSTRAP_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(null);
      });
  });
}

export function AuthHydrationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);

  useEffect(() => {
    let cancelled = false;
    let started = false;

    const finish = () => {
      if (!cancelled) setSessionReady(true);
    };

    const bootstrap = async () => {
      if (started || cancelled) return;
      started = true;

      hydrateToken();

      try {
        const { isAuthenticated, refreshToken } = useAuthStore.getState();
        if (isAuthenticated && refreshToken) {
          await withTimeout(ensureValidAccessToken(), BOOTSTRAP_TIMEOUT_MS);
        }
      } catch {
        // Refresh failures clear the session inside ensureValidAccessToken.
      }

      finish();
    };

    const unsub = onAuthStoreHydrated(() => {
      void bootstrap();
    });

    if (useAuthStore.persist?.hasHydrated?.()) {
      void bootstrap();
    } else {
      // Persist not ready yet — still unblock UI if hydration callback is missed.
      window.setTimeout(() => {
        if (!cancelled && !useAuthStore.getState().sessionReady) {
          void bootstrap();
        }
      }, 1500);
    }

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [hydrateToken, setSessionReady]);

  return <>{children}</>;
}
