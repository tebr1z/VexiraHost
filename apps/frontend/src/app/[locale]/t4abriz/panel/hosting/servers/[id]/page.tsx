"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  HostingServerForm,
  toServerPayload,
  type HostingServerFormValues,
} from "@/components/admin/hosting-server-form";
import { HostingServerPackages } from "@/components/admin/hosting-server-packages";
import { PageHeader } from "@/components/ui";
import {
  deleteHostingServer,
  getHostingServer,
  syncPleskPlansFromServer,
  testHostingServer,
  updateHostingServer,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link, useRouter } from "@/i18n/navigation";
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
  const tp = useTranslations("admin.pages.hostingPlans");
  const ts = useTranslations("admin.pages.hostingServers");
  const tf = useTranslations("admin.forms");
  const tt = useTranslations("admin.toasts");
  const tc = useTranslations("dashboard.common");
  const tu = useTranslations("ui");
  const tw = useTranslations("admin.forms.serverWorkflow");
  const [server, setServer] = useState<HostingServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isAdmin || !params.id) return;
    getHostingServer(params.id)
      .then(setServer)
      .catch((err) => toast(getApiErrorMessage(err, tc("serverNotFound")), "error"))
      .finally(() => setLoading(false));
  }, [isAdmin, params.id, tc]);

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
    osVersion: server.osVersion ?? "",
    sshUsername: server.sshUsername ?? "",
    sshPassword: "",
    sshPort: String(server.sshPort ?? 22),
    isDefault: server.isDefault,
    isActive: server.isActive,
    deployNodeEnabled: server.deployNodeEnabled,
    maxAccounts: server.maxAccounts ? String(server.maxAccounts) : "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={server.name}
        description={
          [
            server.ipAddress,
            server.panel,
            server.osVersion,
            server.sshUsername
              ? `SSH: ${server.sshUsername}@${server.sshPort}`
              : server.sshPasswordConfigured
                ? `SSH: ${server.sshPort}`
                : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        breadcrumbs={[
          { label: ta("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: ta("nav.hostingServers"), href: "/t4abriz/panel/hosting/servers" },
          { label: server.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/t4abriz/panel/hosting/servers/${server.id}/setup`}
              className="border-outline-variant inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold"
            >
              {ts("setupLink")}
            </Link>
            {server.panel === "PLESK" ? (
              <button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    const result = await syncPleskPlansFromServer(server.id);
                    toast(
                      tp("syncSuccess", { created: result.created, updated: result.updated }),
                      "success",
                    );
                  } catch (err) {
                    toast(getApiErrorMessage(err, tp("syncFailed")), "error");
                  } finally {
                    setSyncing(false);
                  }
                }}
                className="border-outline-variant inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
              >
                {syncing ? tp("syncing") : tp("syncFromPlesk")}
              </button>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ServerMetric label="Panel" value={server.panel} detail={server.hostname} />
        <ServerMetric
          label={ts("deployNode")}
          value={server.deployNodeEnabled ? server.deployHealth : tw("hostingOnly")}
          detail={server.deployHealthMessage ?? server.ipAddress}
        />
        <ServerMetric
          label={tf("maxAccountsOptional")}
          value={`${server.activeAccountCount}/${server.maxAccounts ?? "∞"}`}
          detail={server.isActive ? tf("active") : tw("inactive")}
        />
        <ServerMetric
          label="SSH"
          value={
            server.sshPasswordConfigured ? `${server.sshUsername ?? "root"}:${server.sshPort}` : "—"
          }
          detail={server.deployNodeEnabled ? "Vexira Resource Guard" : tw("hostingOnly")}
        />
      </section>

      <HostingServerPackages server={server} />

      {server.credentialHealth.rotationRequired ? (
        <div
          role="alert"
          className="border-error/35 bg-error-container/35 text-on-error-container rounded-2xl border px-5 py-4"
        >
          <p className="font-semibold">{ts("credentialRotationTitle")}</p>
          <p className="mt-1 text-sm">{ts("credentialRotationDescription")}</p>
        </div>
      ) : null}

      <HostingServerForm
        initialValues={initialValues}
        sshPasswordConfigured={server.sshPasswordConfigured}
        submitLabel={tf("updateServer")}
        onSubmit={async (values) => {
          const updated = await updateHostingServer(server.id, toServerPayload(values, true));
          setServer(updated);
          toast(tt("hostingServerUpdated"), "success");
          if (updated.bootstrapJobId) {
            router.push(
              `/t4abriz/panel/hosting/servers/${server.id}/setup?jobId=${encodeURIComponent(updated.bootstrapJobId)}`,
            );
          }
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
        className="text-error disabled:text-on-surface-variant text-sm hover:underline disabled:cursor-not-allowed disabled:no-underline"
      >
        {tf("deleteServer")}
      </button>
    </div>
  );
}

function ServerMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}): React.ReactElement {
  return (
    <div className="border-outline-variant/45 bg-surface rounded-2xl border p-4 shadow-sm">
      <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-on-surface mt-2 truncate text-lg font-semibold">{value}</p>
      <p className="text-on-surface-variant mt-1 truncate text-xs">{detail}</p>
    </div>
  );
}
