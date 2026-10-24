import { BadRequestException } from "@nestjs/common";

import { readDeploymentEnv, requireDeploymentEnv } from "../utils/deployment-env.util";

import { DeployRunner } from "./deploy.runner";
import { DeployService } from "./deploy.service";
import { GitHubDeployService } from "./github-deploy.service";

import { encryptSecret, decryptSecret } from "@/utils/crypto.util";

describe("deployment secrets after an encryption key change", () => {
  const originalKey = process.env.HOSTING_CREDENTIALS_KEY;
  let oldEnv: string;
  beforeEach(() => {
    process.env.HOSTING_CREDENTIALS_KEY = "old-unique-test-key-at-least-32-characters";
    oldEnv = encryptSecret(JSON.stringify({ DATABASE_URL: "private-db-value" }));
    process.env.HOSTING_CREDENTIALS_KEY = "new-unique-test-key-at-least-32-characters";
  });
  afterAll(() => {
    if (originalKey === undefined) delete process.env.HOSTING_CREDENTIALS_KEY;
    else process.env.HOSTING_CREDENTIALS_KEY = originalKey;
  });
  function fixture() {
    const account = {
      id: "account",
      userId: "owner",
      status: "ACTIVE",
      server: { id: "server" },
      plan: { autoDeployEnabled: true, planServers: [], serverId: "server" },
      panel: "PLESK",
      serverId: "server",
    };
    const deployment = {
      id: "app",
      userId: "owner",
      hostingAccountId: "account",
      hostingAccount: account,
      status: "FAILED",
      envVarsEnc: oldEnv,
      runs: [],
      deployDomain: "example.test",
    };
    const repository = {
      listForAccount: jest.fn().mockResolvedValue([deployment]),
      findByIdForUser: jest.fn().mockResolvedValue(deployment),
      findById: jest.fn().mockResolvedValue(deployment),
      update: jest
        .fn()
        .mockImplementation(async (_id, values) => Object.assign(deployment, values)),
      createRun: jest.fn().mockResolvedValue({ id: "run" }),
      appendRunLog: jest.fn(),
      finishRun: jest.fn(),
      updateRunStage: jest.fn(),
    };
    const runner = { enqueue: jest.fn().mockResolvedValue({ queuePosition: 1 }) };
    type Args = ConstructorParameters<typeof DeployService>;
    const service = new DeployService(
      repository as unknown as Args[0],
      { findById: jest.fn().mockResolvedValue(account) } as unknown as Args[1],
      {} as Args[2],
      {} as Args[3],
      runner as unknown as Args[4],
      {} as Args[5],
      {} as Args[6],
      {} as Args[7],
    );
    return { account, deployment, repository, runner, service };
  }
  it("distinguishes absent, readable and unreadable values without treating lost data as an empty env", () => {
    expect(readDeploymentEnv(null)).toEqual({ state: "missing", envVars: {} });
    expect(readDeploymentEnv(oldEnv)).toEqual({ state: "unreadable", envVars: null });
    expect(readDeploymentEnv(encryptSecret('{"TOKEN":"new-value"}'))).toEqual({
      state: "readable",
      envVars: { TOKEN: "new-value" },
    });
  });
  it.each(["[]", "null", '{"TOKEN":123}', "invalid-json"])(
    "rejects invalid encrypted env content: %s",
    (value) => {
      expect(() => requireDeploymentEnv(encryptSecret(value))).toThrow(BadRequestException);
    },
  );
  it("returns recovery state to the owner without exposing ciphertext or false empty data", async () => {
    const { service } = fixture();
    const result = await service.get("account", "app", "owner");
    expect(result).toMatchObject({ envVars: null, envVarsState: "unreadable" });
    expect(JSON.stringify(result)).not.toContain(oldEnv);
  });
  it("identifies unreadable env in existing failed application summaries without exposing values", async () => {
    const { service } = fixture();
    const result = await service.list("account", "owner");
    expect(result[0].envVarsState).toBe("unreadable");
    expect(JSON.stringify(result)).not.toContain(oldEnv);
    expect(JSON.stringify(result)).not.toContain("private-db-value");
  });
  it("does not queue a redeploy with unreadable env", async () => {
    const { service, repository, runner } = fixture();
    await expect(service.redeploy("account", "app", "owner")).rejects.toThrow(
      "Stored application environment",
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(runner.enqueue).not.toHaveBeenCalled();
  });
  it("preserves old ciphertext unless replacement is explicit", async () => {
    const { service, repository } = fixture();
    await expect(
      service.updateEnv("account", "app", "owner", { envVars: {}, redeploy: true }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it("re-encrypts replacement env with the active key and queues a full rebuild", async () => {
    const { service, deployment, runner } = fixture();
    await service.updateEnv("account", "app", "owner", {
      envVars: { DATABASE_URL: "replacement-db", PORT: "9999" },
      redeploy: true,
      replaceUnreadableEnv: true,
    });
    expect(JSON.parse(decryptSecret(deployment.envVarsEnc))).toEqual({
      DATABASE_URL: "replacement-db",
    });
    expect(runner.enqueue).toHaveBeenCalledWith("app");
    expect((await service.get("account", "app", "owner"))?.envVarsState).toBe("readable");
  });
  it("fails queued jobs before allocating ports or touching Plesk when env is unreadable", async () => {
    const { deployment, repository } = fixture();
    const port = { resolveHostPort: jest.fn() };
    const plesk = { ensureSubdomain: jest.fn() };
    const alerts = { notify: jest.fn() };
    type Args = ConstructorParameters<typeof DeployRunner>;
    const runner = new DeployRunner(
      repository as unknown as Args[0],
      port as unknown as Args[1],
      plesk as unknown as Args[2],
      {} as Args[3],
      {} as Args[4],
      {} as Args[5],
      alerts as unknown as Args[6],
    );
    await (runner as unknown as { run(id: string, server: string): Promise<void> }).run(
      "app",
      "server",
    );
    expect(port.resolveHostPort).not.toHaveBeenCalled();
    expect(plesk.ensureSubdomain).not.toHaveBeenCalled();
    expect(deployment).toMatchObject({
      status: "FAILED",
      lastError: expect.stringContaining("Stored application environment"),
    });
    expect(JSON.stringify(alerts.notify.mock.calls)).not.toContain("private-db-value");
  });
  it("asks the customer to reconnect GitHub when its stored token uses an old key", async () => {
    type Args = ConstructorParameters<typeof GitHubDeployService>;
    const github = new GitHubDeployService(
      {
        userGitHubConnection: {
          findUnique: jest.fn().mockResolvedValue({ accessTokenEnc: oldEnv }),
        },
      } as unknown as Args[0],
      {} as Args[1],
      {} as Args[2],
      {} as Args[3],
    );
    await expect(
      github.resolveCloneUrl("owner", "https://github.com/example/app.git"),
    ).rejects.toThrow("Reconnect GitHub");
  });
});
