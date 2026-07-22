"use client";

import { useTranslations } from "next-intl";

import { CartCheckoutView } from "@/components/cart/cart-checkout-view";
import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";

export default function CartPage(): React.ReactElement | null {
  useRequireAuth();
  const td = useTranslations("dashboard");
  const tc = useTranslations("cart");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tc("title")}
        description={tc("description")}
        breadcrumbs={[
          { label: td("nav.dashboard"), href: "/dashboard" },
          { label: td("nav.cart") },
        ]}
      />
      <CartCheckoutView emptyActionHref="/dashboard" />
    </div>
  );
}
