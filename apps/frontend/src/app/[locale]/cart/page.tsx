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
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 md:px-8 lg:px-margin-desktop lg:py-16">
        <div className="mb-8">
          <h1 className="font-jakarta text-3xl font-bold text-primary sm:text-headline-xl">{t("title")}</h1>
          <p className="mt-2 text-on-surface-variant">{t("description")}</p>
        </div>
        <CartCheckoutView quickAccount emptyActionHref="/#pricing" />
      </div>
    </MarketingShell>
  );
}
