"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ServerPlanForm, toServerPlanPayload } from "@/components/admin/server-plan-form";
import { PageHeader } from "@/components/ui";
import { getAdminServerPlan, updateAdminServerPlan, type AdminServerPlan } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { toast } from "@/stores/toast-store";

export default function EditServerPlanPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations("admin");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tu = useTranslations("ui");
  const id = params.id as string;
  const [plan, setPlan] = useState<AdminServerPlan | null>(null);

  useEffect(() => {
    getAdminServerPlan(id).then(setPlan).catch(() => undefined);
  }, [id]);

  if (!plan) return <p className="text-on-surface-variant">{tu("loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={plan.name}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.serverPlans"), href: "/t4abriz/panel/servers/plans" },
          { label: plan.name },
        ]}
      />
      <ServerPlanForm
        includeSlug={false}
        submitLabel={tf("updatePlan")}
        initialValues={{
          slug: plan.slug,
          name: plan.name,
          description: plan.description ?? "",
          type: plan.type,
          cpuCores: String(plan.cpuCores),
          ramGb: String(plan.ramGb),
          diskGb: String(plan.diskGb),
          bandwidthGbps: String(plan.bandwidthGbps),
          regions: plan.regions.join(", "),
          price: String(plan.price),
          isActive: plan.isActive,
          sortOrder: String(plan.sortOrder),
        }}
        onSubmit={async (values) => {
          await updateAdminServerPlan(id, toServerPlanPayload(values, false));
          toast(tt("serverPlanUpdated"), "success");
          router.push("/t4abriz/panel/servers/plans");
        }}
      />
      <Link href="/t4abriz/panel/servers/plans" className="text-sm text-secondary hover:underline">
        ← {ta("actions.back")}
      </Link>
    </div>
  );
}
