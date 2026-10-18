import { ForbiddenException } from "@nestjs/common";

import { DeployService } from "./deploy.service";

describe("resource monitoring authorization", () => {
  it("does not probe another customer's server", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ userId: "owner", status: "ACTIVE" }),
    };
    const remote = { probeResources: jest.fn() };
    type Args = ConstructorParameters<typeof DeployService>;
    const service = new DeployService(
      {} as Args[0],
      repository as unknown as Args[1],
      {} as Args[2],
      {} as Args[3],
      {} as Args[4],
      {} as Args[5],
      remote as unknown as Args[6],
      {} as Args[7],
    );
    await expect(service.resources("account1", "other-user")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(remote.probeResources).not.toHaveBeenCalled();
  });
  it("does not make an SSH request when an account has no deployments", async () => {
    const account = {
      id: "account1",
      userId: "owner",
      status: "ACTIVE",
      panel: "PLESK",
      serverId: "server1",
      server: { id: "server1", deployNodeEnabled: true },
      plan: {
        autoDeployEnabled: true,
        planServers: [],
        serverId: "server1",
        autoDeployCpuPercent: 100,
        autoDeployMemoryMb: 1024,
        autoDeployDiskGb: 1,
        autoDeployMaxApps: 1,
      },
    };
    const repository = { findById: jest.fn().mockResolvedValue(account) };
    const deployRepository = { listByAccount: jest.fn().mockResolvedValue([]) };
    const remote = { probeResources: jest.fn() };
    type Args = ConstructorParameters<typeof DeployService>;
    const service = new DeployService(
      deployRepository as unknown as Args[0],
      repository as unknown as Args[1],
      {} as Args[2],
      {} as Args[3],
      {} as Args[4],
      {} as Args[5],
      remote as unknown as Args[6],
      {} as Args[7],
    );
    await expect(service.resources("account1", "owner")).resolves.toMatchObject({
      ready: false,
      memoryBytes: null,
      diskBytes: null,
      limits: { cpuPercent: 100 },
    });
    expect(remote.probeResources).not.toHaveBeenCalled();
  });
  it("returns an empty workspace before a runtime has been configured", async () => {
    const account = {
      id: "account1",
      userId: "owner",
      status: "ACTIVE",
      panel: "PLESK",
      serverId: "server1",
      server: { id: "server1", deployNodeEnabled: false },
      plan: {
        autoDeployEnabled: true,
        planServers: [],
        serverId: "server1",
        autoDeployCpuPercent: 150,
        autoDeployMemoryMb: 2048,
        autoDeployDiskGb: 10,
        autoDeployMaxApps: 3,
      },
    };
    const repository = { findById: jest.fn().mockResolvedValue(account) };
    const deployRepository = { listByAccount: jest.fn().mockResolvedValue([]) };
    const remote = { probeResources: jest.fn() };
    type Args = ConstructorParameters<typeof DeployService>;
    const service = new DeployService(
      deployRepository as unknown as Args[0],
      repository as unknown as Args[1],
      {} as Args[2],
      {} as Args[3],
      {} as Args[4],
      {} as Args[5],
      remote as unknown as Args[6],
      {} as Args[7],
    );
    await expect(service.resources("account1", "owner")).resolves.toMatchObject({
      ready: false,
      hasDeployments: false,
      memoryBytes: null,
      diskBytes: null,
      limits: { cpuPercent: 150, memoryMb: 2048, diskGb: 10 },
    });
    expect(remote.probeResources).not.toHaveBeenCalled();
  });
});
