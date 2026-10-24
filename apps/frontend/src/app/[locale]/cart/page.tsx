"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { CartCheckoutView } from "@/components/cart/cart-checkout-view";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { useAuthStore } from "@/stores/auth-store";

export default function PublicCartPage(): React.ReactElement {
  const t = useTranslations("cart");
  const hydrateToken = useAuthStore((s) => s.hydrateToken);

  useEffect(() => {
    hydrateToken();
  }, [hydrateToken]);

  return (
    <MarketingShell>
      <div className="lg:px-margin-desktop mx-auto max-w-6xl px-4 py-10 sm:px-5 md:px-8 lg:py-16">
        <div className="checkout-heading mb-8">
          <h1 className="font-jakarta text-primary sm:text-headline-xl text-3xl font-bold">
            {t("title")}
          </h1>
          <p className="text-on-surface-variant mt-2">{t("description")}</p>
        </div>
        <CartCheckoutView quickAccount emptyActionHref="/#pricing" />
      </div>
    </MarketingShell>
  );
}
