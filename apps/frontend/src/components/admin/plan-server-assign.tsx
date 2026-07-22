"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";
import { updateAdminHostingPlan, type AdminHostingPlan, type HostingServer } from "@/features/admin";
import { toast } from "@/stores/toast-store";

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
  const tp = useTranslations("admin.pages.hostingPlans");
  const [saving, setSaving] = useState(false);

  const matchingServers = useMemo(
    () => servers.filter((server) => server.isActive && server.panel === plan.panel),
    [plan.panel, servers],
  );

  const handleChange = async (serverId: string) => {
    if (!serverId || serverId === plan.serverId) return;

    setSaving(true);
    try {
      const updated = await updateAdminHostingPlan(plan.id, { serverId });
      onUpdated(updated);
      toast(tp("serverAssigned"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("serverAssignFailed")), "error");
    } finally {
      setSaving(false);
    }
  };

  if (matchingServers.length === 0) {
    return (
      <span className="text-xs text-error">{tf("noHostingServersForPanel")}</span>
    );
  }

  return (
    <select
      value={plan.serverId ?? ""}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="h-9 min-w-[180px] max-w-[240px] rounded-lg border border-outline-variant bg-surface px-2 text-sm disabled:opacity-60"
    >
      <option value="">{tp("selectServer")}</option>
      {matchingServers.map((server) => (
        <option key={server.id} value={server.id}>
          {server.name} · {server.ipAddress}
        </option>
      ))}
    </select>
  );
}
