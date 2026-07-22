"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { detectGeoCurrency, usePricingStore } from "@/stores/pricing-store";

/**
 * Bootstraps currency from geo (guests) and syncs from authenticated user profile.
 */
export function PricingBootstrap({ children }: { children: React.ReactNode }): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const setFromGeo = usePricingStore((s) => s.setFromGeo);
  const setFromUser = usePricingStore((s) => s.setFromUser);
  const hydrated = usePricingStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;

    if (user?.preferredCurrency) {
      setFromUser({
        preferredCurrency: user.preferredCurrency,
        billingPeriod: user.billingPeriod,
        currencyLocked: user.currencyLocked,
      });
      return;
    }

    void detectGeoCurrency().then((geo) => {
      setFromGeo(geo);
    });
  }, [hydrated, user, setFromGeo, setFromUser]);

  return <>{children}</>;
}
