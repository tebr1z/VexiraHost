"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  HostingServerForm,
  toServerPayload,
  type HostingServerFormValues,
} from "@/components/admin/hosting-server-form";
import { PageHeader } from "@/components/ui";
import {
  deleteHostingServer,
  getHostingServer,
  testHostingServer,
  updateHostingServer,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function EditHostingServerPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const ta = useTranslations("admin");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tc = useTranslations("dashboard.common");
  const tu = useTranslations("ui");
  const [server, setServer] = useState<HostingServer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin || !params.id) return;
    getHostingServer(params.id)
      .then(setServer)
      .finally(() => setLoading(false));
  }, [isAdmin, params.id]);

  if (!isAdmin) {
    return <p className="text-on-surface-variant">{tf("hostingServersEditAdminOnly")}</p>;
  }

  if (loading) return <p className="text-on-surface-variant">{tu("loading")}</p>;
  if (!server) return <p className="text-error">{tc("serverNotFound")}</p>;

  const hasAccounts = server.accountCount > 0;

  const initialValues: Partial<HostingServerFormValues> = {
    name: server.name,
    hostname: server.hostname,
    ipAddress: server.ipAddress,
    panel: server.panel,
    whmUsername: server.whmUsername,
    whmPassword: "",
    isDefault: server.isDefault,
    isActive: server.isActive,
    maxAccounts: server.maxAccounts ? String(server.maxAccounts) : "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={server.name}
        description={`${server.ipAddress} · ${server.panel}`}
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingServers"), href: "/t4abriz/panel/hosting/servers" },
          { label: server.name },
        ]}
      />

      <HostingServerForm
        initialValues={initialValues}
        submitLabel={tf("updateServer")}
        onSubmit={async (values) => {
          await updateHostingServer(server.id, toServerPayload(values, true));
          toast(tt("hostingServerUpdated"), "success");
          router.push("/t4abriz/panel/hosting/servers");
        }}
        onTest={async () => {
          const result = await testHostingServer(server.id);
          setServer((prev) =>
            prev
              ? {
                  ...prev,
                  lastCheckedAt: result.lastCheckedAt,
                  lastConnectionOk: result.lastConnectionOk,
                }
              : prev,
          );
          toast(result.message, result.ok ? "success" : "error");
        }}
      />

      {hasAccounts && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p>{tf("deleteServerBlocked", { count: server.accountCount })}</p>
          <Link
            href="/t4abriz/panel/hosting/accounts"
            className="mt-2 inline-flex text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
          >
            {tf("viewHostingAccounts")}
          </Link>
        </div>
      )}

      <button
        type="button"
        disabled={hasAccounts}
        onClick={async () => {
          if (!confirm(tf("deleteServerConfirm"))) return;
          try {
            await deleteHostingServer(server.id);
            toast(tt("serverDeleted"), "success");
            router.push("/t4abriz/panel/hosting/servers");
          } catch (err) {
            toast(getApiErrorMessage(err, tt("cannotDeleteServer")), "error");
          }
        }}
        className="text-sm text-error hover:underline disabled:cursor-not-allowed disabled:text-on-surface-variant disabled:no-underline"
      >
        {tf("deleteServer")}
      </button>
    </div>
  );
}
