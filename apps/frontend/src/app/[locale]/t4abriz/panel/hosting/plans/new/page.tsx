"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import {
  HostingPlanForm,
  toHostingPlanPayload,
  type HostingPlanFormValues,
} from "@/components/admin/hosting-plan-form";
import { LoadingSkeletonList, PageHeader } from "@/components/ui";
import { createAdminHostingPlan, getHostingServer, type HostingServer } from "@/features/admin";
import { useAccessTokenReady, useRequireAuth } from "@/features/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

export default function NewHostingPlanPage(): React.ReactElement {
  return (
    <Suspense fallback={<LoadingSkeletonList rows={3} />}>
      <NewHostingPlanContent />
    </Suspense>
  );
}

function NewHostingPlanContent(): React.ReactElement {
  useRequireAuth();
  const router = useRouter();
  const query = useSearchParams();
  const serverId = query.get("serverId");
  const deployRequested = query.get("autoDeploy") === "1";
  const ready = useAccessTokenReady();
  const ta = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingPlans");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tw = useTranslations("admin.forms.serverWorkflow");
  const [context, setContext] = useState<{
    id: string;
    server?: HostingServer;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!serverId || !ready) return;
    let cancelled = false;
    getHostingServer(serverId)
      .then((server) => {
        if (cancelled) return;
        if (
          !server.isActive ||
          (deployRequested && (server.panel !== "PLESK" || !server.deployNodeEnabled))
        ) {
          setContext({ id: serverId, error: tw("invalidServer") });
        } else {
          setContext({ id: serverId, server });
        }
      })
      .catch((err) => {
        if (!cancelled)
          setContext({ id: serverId, error: getApiErrorMessage(err, tw("loadServersFailed")) });
      });
    return () => {
      cancelled = true;
    };
  }, [serverId, ready, deployRequested, tw]);

  const current = context?.id === serverId ? context : null;
  const server = current?.server;
  const initialValues: Partial<HostingPlanFormValues> | undefined = server
    ? {
        panel: server.panel,
        serverIds: [server.id],
        autoDeployEnabled: deployRequested,
        autoDeployServerId: server.deployNodeEnabled ? server.id : "",
      }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={deployRequested ? tw("newDeployPackage") : tp("addTitle")}
        description={server ? tw("packageForServer", { name: server.name }) : undefined}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingPlans"), href: "/t4abriz/panel/hosting/plans" },
          ...(server
            ? [{ label: server.name, href: `/t4abriz/panel/hosting/servers/${server.id}` }]
            : []),
          { label: ta("breadcrumb.new") },
        ]}
      />
      {serverId && !current ? (
        <LoadingSkeletonList rows={3} />
      ) : current?.error ? (
        <div
          role="alert"
          className="border-outline-variant bg-surface space-y-3 rounded-2xl border p-6"
        >
          <p className="text-error text-sm">{current.error}</p>
          <Link
            href="/t4abriz/panel/hosting/servers"
            className="text-primary text-sm font-semibold"
          >
            {ta("nav.hostingServers")}
          </Link>
        </div>
      ) : (
        <HostingPlanForm
          key={`${serverId ?? "new"}:${deployRequested}`}
          initialValues={initialValues}
          submitLabel={tf("savePlan")}
          onSubmit={async (values) => {
            await createAdminHostingPlan(toHostingPlanPayload(values));
            toast(tt("hostingPlanCreated"), "success");
            router.push(
              server
                ? `/t4abriz/panel/hosting/servers/${server.id}`
                : "/t4abriz/panel/hosting/plans",
            );
          }}
        />
      )}
    </div>
  );
}
