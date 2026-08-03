"use client";

import { useTranslations } from "next-intl";

import { PromoCodeForm, toPromoCodePayload } from "@/components/admin/promo-code-form";
import { PageHeader } from "@/components/ui";
import { createAdminPromoCode } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

export default function NewPromoCodePage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.promoCodes");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.promoCodes"), href: "/t4abriz/panel/promo-codes" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <PromoCodeForm
        submitLabel={tf("savePromo")}
        onSubmit={async (values) => {
          await createAdminPromoCode(toPromoCodePayload(values));
          toast(tt("promoCreated"), "success");
          router.push("/t4abriz/panel/promo-codes");
        }}
      />
    </div>
  );
}
