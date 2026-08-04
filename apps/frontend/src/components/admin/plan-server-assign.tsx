"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import {
  updateAdminHostingPlan,
  type AdminHostingPlan,
  type HostingServer,
} from "@/features/admin";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/stores/toast-store";

function formatCapacity(server: HostingServer): string {
  if (server.maxAccounts == null) return `${server.accountCount}/∞`;
  return `${server.accountCount}/${server.maxAccounts}`;
}

export function PlanServerAssign({
  plan,
  servers,
  onUpdated,
}: {
  plan: AdminHostingPlan;
  servers: HostingServer[];
  onUpdated: (plan: AdminHostingPlan) => void;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const ta = useTranslations("admin.actions");
  const tp = useTranslations("admin.pages.hostingPlans");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverIds, setServerIds] = useState<string[]>(() =>
    plan.servers?.length ? plan.servers.map((s) => s.id) : plan.serverId ? [plan.serverId] : [],
  );
  const [distributionMode, setDistributionMode] = useState<"FAILOVER" | "BALANCED">(
    plan.distributionMode ?? "FAILOVER",
  );

  const matchingServers = useMemo(
    () => servers.filter((server) => server.isActive && server.panel === plan.panel),
    [plan.panel, servers],
  );

  const summary = useMemo(() => {
    const names = serverIds
      .map(
        (id) =>
          matchingServers.find((s) => s.id === id)?.name ??
          plan.servers?.find((s) => s.id === id)?.name,
      )
      .filter(Boolean);
    if (names.length === 0) return tp("selectServer");
    if (names.length === 1) return names[0]!;
    return tp("serversSummary", { count: names.length, first: names[0]!, extra: names.length - 1 });
  }, [matchingServers, plan.servers, serverIds, tp]);

  const toggleServer = (serverId: string) => {
    setServerIds((prev) =>
      prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId],
    );
  };

  const handleSave = async () => {
    if (serverIds.length === 0) {
      toast(tf("hostingServerRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAdminHostingPlan(plan.id, {
        serverIds,
        serverId: serverIds[0],
        distributionMode,
      });
      onUpdated(updated);
      setOpen(false);
      toast(tp("serverAssigned"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("serverAssignFailed")), "error");
    } finally {
      setSaving(false);
    }
  };

  if (matchingServers.length === 0) {
    return <span className="text-error text-xs">{tf("noHostingServersForPanel")}</span>;
  }

  return (
    <div className="relative min-w-[200px] max-w-[280px]">
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          setServerIds(
            plan.servers?.length
              ? plan.servers.map((s) => s.id)
              : plan.serverId
                ? [plan.serverId]
                : [],
          );
          setDistributionMode(plan.distributionMode ?? "FAILOVER");
          setOpen((prev) => !prev);
        }}
        className="border-outline-variant bg-surface flex h-auto min-h-9 w-full flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left text-sm disabled:opacity-60"
      >
        <span className="text-on-surface truncate font-medium">{summary}</span>
        <span className="text-on-surface-variant text-[11px]">
          {distributionMode === "BALANCED"
            ? tf("distributionBalanced")
            : tf("distributionFailover")}
        </span>
      </button>

      {open ? (
        <div className="border-outline-variant bg-surface absolute left-0 z-20 mt-1 w-[280px] rounded-xl border p-3 shadow-lg">
          <p className="text-on-surface-variant mb-2 text-xs">{tf("hostingServersHelp")}</p>
          <ul className="mb-3 max-h-40 space-y-1.5 overflow-y-auto">
            {matchingServers.map((server) => (
              <li key={server.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={serverIds.includes(server.id)}
                    onChange={() => toggleServer(server.id)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{server.name}</span>
                    <span className="text-on-surface-variant text-[11px]">
                      {formatCapacity(server)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <select
            value={distributionMode}
            onChange={(e) => setDistributionMode(e.target.value as "FAILOVER" | "BALANCED")}
            className="border-outline-variant bg-surface mb-3 h-9 w-full rounded-lg border px-2 text-sm"
          >
            <option value="FAILOVER">{tf("distributionFailover")}</option>
            <option value="BALANCED">{tf("distributionBalanced")}</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-outline-variant h-9 flex-1 rounded-lg border text-sm"
            >
              {ta("cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="bg-primary text-on-primary h-9 flex-1 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {saving ? tf("saving") : ta("save")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
