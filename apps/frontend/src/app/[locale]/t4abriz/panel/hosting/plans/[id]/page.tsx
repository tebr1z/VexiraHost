"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { HostingPlanForm, toHostingPlanPayload } from "@/components/admin/hosting-plan-form";
import { PageHeader } from "@/components/ui";
import { deleteAdminHostingPlan, getAdminHostingPlan, updateAdminHostingPlan, type AdminHostingPlan } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function EditHostingPlanPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [plan, setPlan] = useState<AdminHostingPlan | null>(null);

  useEffect(() => {
    getAdminHostingPlan(id).then(setPlan).catch(() => undefined);
  }, [id]);

  if (!plan) return <p className="text-on-surface-variant">{tu("loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={plan.name}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingPlans"), href: "/t4abriz/panel/hosting/plans" },
          { label: plan.name },
        ]}
      />
      <HostingPlanForm
        currentSlug={plan.slug}
        submitLabel={tf("updatePlan")}
        initialValues={{
          name: plan.name,
          description: plan.description ?? "",
          panel: plan.panel,
          serverId: plan.serverId ?? "",
          diskGb: String(plan.diskGb),
          bandwidthGb: String(plan.bandwidthGb),
          maxDomains: String(plan.maxDomains),
          maxEmails: String(plan.maxEmails),
          maxDatabases: String(plan.maxDatabases),
          price: String(plan.price),
          isActive: plan.isActive,
          sortOrder: String(plan.sortOrder),
          pleskPlanName: plan.pleskPlanName ?? "",
        }}
        onSubmit={async (values) => {
          await updateAdminHostingPlan(id, toHostingPlanPayload(values));
          toast(tt("hostingPlanUpdated"), "success");
          router.push("/t4abriz/panel/hosting/plans");
        }}
      />
      <button
        type="button"
        className="text-sm text-error hover:underline"
        onClick={async () => {
          if (!confirm(tf("deletePlanConfirm"))) return;
          try {
            await deleteAdminHostingPlan(id);
            toast(tt("planDeleted"), "success");
            router.push("/t4abriz/panel/hosting/plans");
          } catch {
            toast(tt("cannotDeletePlan"), "error");
          }
        }}
      >
        {tf("deletePlan")}
      </button>
      <Link href="/t4abriz/panel/hosting/plans" className="block text-sm text-secondary hover:underline">
        {tf("backToPlans")}
      </Link>
    </div>
  );
}
