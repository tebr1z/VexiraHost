"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  PromoCodeForm,
  promoCodeToFormValues,
  toPromoCodePayload,
} from "@/components/admin/promo-code-form";
import { PageHeader } from "@/components/ui";
import { getAdminPromoCode, updateAdminPromoCode, type AdminPromoCode } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

export default function EditPromoCodePage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.promoCodes");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [promo, setPromo] = useState<AdminPromoCode | null>(null);

  useEffect(() => {
    getAdminPromoCode(id)
      .then(setPromo)
      .catch(() => {
        toast(tp("loadFailed"), "error");
        router.push("/t4abriz/panel/promo-codes");
      });
  }, [id, router, tp]);

  if (!promo) {
    return <p className="text-on-surface-variant">{tu("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("editTitle", { code: promo.code })}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.promoCodes"), href: "/t4abriz/panel/promo-codes" },
          { label: promo.code },
        ]}
      />
      <PromoCodeForm
        initialValues={promoCodeToFormValues(promo)}
        submitLabel={tf("savePromo")}
        onSubmit={async (values) => {
          await updateAdminPromoCode(promo.id, toPromoCodePayload(values));
          toast(tt("promoUpdated"), "success");
          router.push("/t4abriz/panel/promo-codes");
        }}
      />
    </div>
  );
}
