import { HostingDistributionMode, type HostingPanel } from "@prisma/client";

export type ServerCandidate = {
  id: string;
  panel: HostingPanel | string;
  isActive: boolean;
  maxAccounts: number | null;
  accountCount: number;
  priority: number;
};

export function serverHasSalesCapacity(server: {
  maxAccounts: number | null;
  accountCount: number;
}): boolean {
  return server.maxAccounts == null || server.accountCount < server.maxAccounts;
}

export function selectHostingServerForPlan(input: {
  panel: HostingPanel | string;
  distributionMode?: HostingDistributionMode | string | null;
  candidates: ServerCandidate[];
}): ServerCandidate {
  const mode =
    input.distributionMode === HostingDistributionMode.BALANCED ||
    input.distributionMode === "BALANCED"
      ? HostingDistributionMode.BALANCED
      : HostingDistributionMode.FAILOVER;

  const available = input.candidates.filter(
    (server) => server.isActive && server.panel === input.panel && serverHasSalesCapacity(server),
  );

  if (available.length === 0) {
    throw new Error("NO_CAPACITY");
  }

  if (mode === HostingDistributionMode.BALANCED) {
    return [...available].sort((a, b) => {
      if (a.accountCount !== b.accountCount) return a.accountCount - b.accountCount;
      return a.priority - b.priority;
    })[0]!;
  }

  return [...available].sort((a, b) => a.priority - b.priority)[0]!;
}

export function collectPlanServerCandidates(plan: {
  panel: HostingPanel | string;
  server?: {
    id: string;
    panel: HostingPanel | string;
    isActive: boolean;
    maxAccounts: number | null;
    accountCount: number;
  } | null;
  planServers?: Array<{
    priority: number;
    isActive: boolean;
    server: {
      id: string;
      panel: HostingPanel | string;
      isActive: boolean;
      maxAccounts: number | null;
      accountCount: number;
    };
  }>;
}): ServerCandidate[] {
  const byId = new Map<string, ServerCandidate>();

  for (const link of plan.planServers ?? []) {
    if (!link.isActive) continue;
    byId.set(link.server.id, {
      id: link.server.id,
      panel: link.server.panel,
      isActive: link.server.isActive,
      maxAccounts: link.server.maxAccounts,
      accountCount: link.server.accountCount,
      priority: link.priority,
    });
  }

  if (plan.server && !byId.has(plan.server.id)) {
    byId.set(plan.server.id, {
      id: plan.server.id,
      panel: plan.server.panel,
      isActive: plan.server.isActive,
      maxAccounts: plan.server.maxAccounts,
      accountCount: plan.server.accountCount,
      priority: 0,
    });
  }

  return [...byId.values()];
}
