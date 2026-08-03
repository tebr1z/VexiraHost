"use client";

import { useTranslations } from "next-intl";

import { CampaignForm, toCampaignPayload } from "@/components/admin/campaign-form";
import { PageHeader } from "@/components/ui";
import { createAdminCampaign } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { useRouter } from "@/i18n/navigation";
import { toast } from "@/stores/toast-store";

export default function NewCampaignPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.campaigns");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.campaigns"), href: "/t4abriz/panel/campaigns" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <CampaignForm
        submitLabel={tf("saveCampaign")}
        onSubmit={async (values) => {
          const created = await createAdminCampaign(toCampaignPayload(values));
          toast(tt("campaignCreated"), "success");
          router.push(`/t4abriz/panel/campaigns/${created.id}`);
        }}
      />
    </div>
  );
}
