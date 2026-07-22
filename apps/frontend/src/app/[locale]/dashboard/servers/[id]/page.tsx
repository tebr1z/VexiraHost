"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  InstanceHeader,
  InstanceMetrics,
  InstanceShell,
  InstanceTabs,
} from "@/components/instances";
import { useRequireAuth } from "@/features/auth";
import {
  getServer,
  getServerMetrics,
  serverPowerAction,
  type ServerInstance,
  type ServerMetrics,
} from "@/features/servers";
import { formatDate } from "@/lib/i18n/format";

const METRICS_POLL_MS = 30_000;

export default function ServerDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams();
  const locale = useLocale();
  const tc = useTranslations("dashboard.common");
  const serverId = params.id as string;
  const [server, setServer] = useState<ServerInstance | null>(null);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [powerLoading, setPowerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    const metricsData = await getServerMetrics(serverId);
    setMetrics(metricsData);
  }, [serverId]);

  const load = useCallback(async () => {
    try {
      const [serverData, metricsData] = await Promise.all([
        getServer(serverId),
        getServerMetrics(serverId),
      ]);
      setServer(serverData);
      setMetrics(metricsData);
    } catch {
      setError(tc("failedLoadServer"));
    } finally {
      setLoading(false);
    }
  }, [serverId, tc]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!server || server.status !== "RUNNING") return;
    const timer = window.setInterval(() => {
      loadMetrics().catch(() => undefined);
    }, METRICS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [server, loadMetrics]);

  const handlePower = async (action: "REBOOT" | "SHUTDOWN" | "START" | "STOP") => {
    setPowerLoading(true);
    setError(null);
    try {
      const result = await serverPowerAction(serverId, action);
      setServer(result.server);
      await loadMetrics();
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tc("powerActionFailed");
      setError(message ?? tc("powerActionFailed"));
    } finally {
      setPowerLoading(false);
    }
  };

  if (loading) {
    return <p className="text-on-surface-variant">{tc("loadingServer")}</p>;
  }

  if (!server || !metrics) {
    return (
      <div>
        <p className="text-error">{error ?? tc("serverNotFound")}</p>
        <Link href="/dashboard/servers" className="mt-4 inline-block text-secondary hover:underline">
          {tc("backToServers")}
        </Link>
      </div>
    );
  }

  return (
    <InstanceShell activeNav="compute">
      {error && (
        <p className="mb-4 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <InstanceHeader
        displayName={server.displayName}
        status={server.status}
        ipv4={server.ipv4}
        regionLabel={server.regionLabel}
        powerLoading={powerLoading}
        onStart={server.status === "STOPPED" ? () => handlePower("START") : undefined}
        onReboot={server.status === "RUNNING" ? () => handlePower("REBOOT") : undefined}
        onShutdown={server.status === "RUNNING" ? () => handlePower("SHUTDOWN") : undefined}
      />
      <InstanceMetrics metrics={metrics} />
      <InstanceTabs />

      <section className="mt-stack-md rounded-2xl border border-outline-variant/50 bg-surface p-5">
        <h2 className="font-jakarta text-xl font-semibold">{tc("serverDetails")}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">{tc("hostname")}</dt>
            <dd>{server.hostname}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{tc("plan")}</dt>
            <dd>{server.plan.name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{tc("proxmoxVm")}</dt>
            <dd>
              {server.proxmoxVmId ?? "—"} @ {server.proxmoxNode ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{tc("os")}</dt>
            <dd>{server.osTemplate}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{tc("disk")}</dt>
            <dd>{server.diskGb} GB</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">{tc("provisionedAt")}</dt>
            <dd>
              {server.provisionedAt ? formatDate(server.provisionedAt, locale) : tc("pending")}
            </dd>
          </div>
        </dl>
      </section>
    </InstanceShell>
  );
}
