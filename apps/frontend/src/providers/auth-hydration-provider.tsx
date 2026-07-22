"use client";

import { useEffect, useRef } from "react";

import { ensureValidAccessToken } from "@/features/auth/services/auth-session.service";
import { onAuthStoreHydrated, useAuthStore } from "@/stores/auth-store";

export function AuthHydrationProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const hydrateToken = useAuthStore((s) => s.hydrateToken);
  const setSessionReady = useAuthStore((s) => s.setSessionReady);
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (startedRef.current) return;
      startedRef.current = true;

      hydrateToken();

      const { isAuthenticated, refreshToken } = useAuthStore.getState();
      if (isAuthenticated && refreshToken) {
        await ensureValidAccessToken();
      }

      if (!cancelled) {
        setSessionReady(true);
      }
    };

    const unsub = onAuthStoreHydrated(() => {
      void bootstrap();
    });

    if (useAuthStore.persist?.hasHydrated?.()) {
      void bootstrap();
    }

    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, [hydrateToken, setSessionReady]);

  return <>{children}</>;
}
