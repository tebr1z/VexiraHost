"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { ServerPlanForm, toServerPlanPayload } from "@/components/admin/server-plan-form";
import { PageHeader } from "@/components/ui";
import { createAdminServerPlan } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function NewServerPlanPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.serverPlans");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tp("addTitle")}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.serverPlans"), href: "/t4abriz/panel/servers/plans" },
          { label: ta("breadcrumb.new") },
        ]}
      />
      <ServerPlanForm
        submitLabel={tf("savePlan")}
        onSubmit={async (values) => {
          await createAdminServerPlan(toServerPlanPayload(values, true) as Parameters<typeof createAdminServerPlan>[0]);
          toast(tt("serverPlanCreated"), "success");
          router.push("/t4abriz/panel/servers/plans");
        }}
      />
    </div>
  );
}
