"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { TldPricingForm, toTldPricingPayload } from "@/components/admin/tld-pricing-form";
import { PageHeader } from "@/components/ui";
import { createAdminTld } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function NewTldPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.tldPricing");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.tldPricing"), href: "/t4abriz/panel/domains/tlds" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <TldPricingForm
        submitLabel={tf("saveTld")}
        onSubmit={async (values) => {
          await createAdminTld(toTldPricingPayload(values, true) as Parameters<typeof createAdminTld>[0]);
          toast(tt("tldCreated"), "success");
          router.push("/t4abriz/panel/domains/tlds");
        }}
      />
    </div>
  );
}
