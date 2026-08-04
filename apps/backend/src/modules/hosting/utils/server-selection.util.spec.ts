import { HostingDistributionMode, HostingPanel } from "@prisma/client";

import {
  collectPlanServerCandidates,
  selectHostingServerForPlan,
  serverHasSalesCapacity,
} from "./server-selection.util";

const base = {
  panel: HostingPanel.PLESK,
  isActive: true,
};

describe("serverHasSalesCapacity", () => {
  it("allows unlimited when maxAccounts is null", () => {
    expect(serverHasSalesCapacity({ maxAccounts: null, accountCount: 999 })).toBe(true);
  });

  it("blocks when at or over limit", () => {
    expect(serverHasSalesCapacity({ maxAccounts: 10, accountCount: 10 })).toBe(false);
    expect(serverHasSalesCapacity({ maxAccounts: 10, accountCount: 9 })).toBe(true);
  });
});

describe("selectHostingServerForPlan", () => {
  const candidates = [
    { id: "a", ...base, maxAccounts: 2, accountCount: 2, priority: 0 },
    { id: "b", ...base, maxAccounts: 5, accountCount: 1, priority: 1 },
    { id: "c", ...base, maxAccounts: 5, accountCount: 0, priority: 2 },
  ];

  it("failover picks first with capacity by priority", () => {
    const selected = selectHostingServerForPlan({
      panel: HostingPanel.PLESK,
      distributionMode: HostingDistributionMode.FAILOVER,
      candidates,
    });
    expect(selected.id).toBe("b");
  });

  it("balanced picks least loaded", () => {
    const selected = selectHostingServerForPlan({
      panel: HostingPanel.PLESK,
      distributionMode: HostingDistributionMode.BALANCED,
      candidates,
    });
    expect(selected.id).toBe("c");
  });

  it("throws when all full", () => {
    expect(() =>
      selectHostingServerForPlan({
        panel: HostingPanel.PLESK,
        distributionMode: HostingDistributionMode.FAILOVER,
        candidates: candidates.map((s) => ({ ...s, accountCount: s.maxAccounts! })),
      }),
    ).toThrow("NO_CAPACITY");
  });
});

describe("collectPlanServerCandidates", () => {
  it("merges planServers and legacy server", () => {
    const candidates = collectPlanServerCandidates({
      panel: HostingPanel.PLESK,
      server: {
        id: "legacy",
        panel: HostingPanel.PLESK,
        isActive: true,
        maxAccounts: null,
        accountCount: 0,
      },
      planServers: [
        {
          priority: 1,
          isActive: true,
          server: {
            id: "linked",
            panel: HostingPanel.PLESK,
            isActive: true,
            maxAccounts: 10,
            accountCount: 3,
          },
        },
      ],
    });
    expect(candidates.map((c) => c.id).sort()).toEqual(["legacy", "linked"]);
  });
});
