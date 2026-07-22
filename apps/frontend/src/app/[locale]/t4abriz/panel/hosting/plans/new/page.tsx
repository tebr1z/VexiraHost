"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { HostingPlanForm, toHostingPlanPayload } from "@/components/admin/hosting-plan-form";
import { PageHeader } from "@/components/ui";
import { createAdminHostingPlan } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function NewHostingPlanPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingPlans");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingPlans"), href: "/t4abriz/panel/hosting/plans" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <HostingPlanForm
        submitLabel={tf("savePlan")}
        onSubmit={async (values) => {
          await createAdminHostingPlan(toHostingPlanPayload(values));
          toast(tt("hostingPlanCreated"), "success");
          router.push("/t4abriz/panel/hosting/plans");
        }}
      />
    </div>
  );
}
