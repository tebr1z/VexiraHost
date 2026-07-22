"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { TldPricingForm, toTldPricingPayload } from "@/components/admin/tld-pricing-form";
import { PageHeader } from "@/components/ui";
import { deleteAdminTld, getAdminTld, updateAdminTld, type AdminTldPricing } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function EditTldPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [tld, setTld] = useState<AdminTldPricing | null>(null);

  useEffect(() => {
    getAdminTld(id).then(setTld).catch(() => undefined);
  }, [id]);

  if (!tld) return <p className="text-on-surface-variant">{tu("loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`.${tld.tld}`}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.tldPricing"), href: "/t4abriz/panel/domains/tlds" },
          { label: `.${tld.tld}` },
        ]}
      />
      <TldPricingForm
        includeTld={false}
        submitLabel={tf("updateTld")}
        initialValues={{
          tld: tld.tld,
          registerPrice: String(tld.registerPrice),
          renewPrice: String(tld.renewPrice),
          transferPrice: String(tld.transferPrice),
          isActive: tld.isActive,
          sortOrder: String(tld.sortOrder),
        }}
        onSubmit={async (values) => {
          await updateAdminTld(id, toTldPricingPayload(values, false));
          toast(tt("tldUpdated"), "success");
          router.push("/t4abriz/panel/domains/tlds");
        }}
      />
      <button
        type="button"
        className="text-sm text-error hover:underline"
        onClick={async () => {
          if (!confirm(tf("deleteTldConfirm", { tld: tld.tld }))) return;
          await deleteAdminTld(id);
          toast(tt("tldDeleted"), "success");
          router.push("/t4abriz/panel/domains/tlds");
        }}
      >
        {tf("deleteTld")}
      </button>
      <Link href="/t4abriz/panel/domains/tlds" className="block text-sm text-secondary hover:underline">
        {tf("backToTlds")}
      </Link>
    </div>
  );
}
