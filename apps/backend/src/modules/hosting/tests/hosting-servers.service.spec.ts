import { BadRequestException, ConflictException } from "@nestjs/common";
import { HostingPanel, type HostingServer } from "@prisma/client";
import { validate } from "class-validator";

import { CreateHostingServerDto, UpdateHostingServerDto } from "../dto/hosting-server.dto";
import { HostingServersService } from "../service/hosting-servers.service";

import { resolveHostingServerSshOptions } from "@/modules/deploy/utils/server-ssh.util";
import { decryptSecret, encryptSecret } from "@/utils/crypto.util";

const existingServer = {
  id: "server-1",
  name: "Plesk One",
  hostname: "plesk.example.com",
  ipAddress: "192.0.2.10",
  panel: HostingPanel.PLESK,
  whmUsername: "admin",
  whmPasswordEnc: encryptSecret("panel-test-password"),
  sshUsername: null,
  sshPasswordEnc: null,
  sshPort: 22,
  isActive: true,
  deployNodeEnabled: false,
  accountCount: 0,
} as HostingServer;

const input = {
  name: "Plesk One",
  hostname: "plesk.example.com",
  ipAddress: "192.0.2.10",
  panel: HostingPanel.PLESK,
  whmUsername: "admin",
  whmPassword: "panel-test-password",
};

function setup(overrides: Partial<HostingServer> = {}) {
  const server = { ...existingServer, ...overrides };
  const repository = {
    findById: jest.fn().mockResolvedValue(server),
    create: jest
      .fn()
      .mockImplementation(async (data: Partial<HostingServer>) => ({ ...server, ...data })),
    update: jest.fn().mockImplementation(async (_id: string, data: Partial<HostingServer>) => ({
      ...server,
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    })),
    delete: jest.fn().mockResolvedValue(server),
    countAccounts: jest.fn().mockResolvedValue(0),
    countLinkedPlans: jest.fn().mockResolvedValue(0),
    countDeployDependents: jest.fn().mockResolvedValue(0),
  };
  type Args = ConstructorParameters<typeof HostingServersService>;
  const service = new HostingServersService(
    repository as unknown as Args[0],
    {} as Args[1],
    {} as Args[2],
    {} as Args[3],
    {} as Args[4],
    {} as Args[5],
  );
  return { service, repository };
}

describe("Hosting server / Auto Deploy workflow", () => {
  it("allows a hosting-only server without SSH credentials", async () => {
    const { service } = setup();
    await expect(service.createServer(input)).resolves.toMatchObject({ deployNodeEnabled: false });
  });

  it.each([
    { sshUsername: "root" },
    { sshPassword: "ssh-test-password" },
    { sshUsername: "   ", sshPassword: "ssh-test-password" },
  ])("requires dedicated SSH credentials for new deploy nodes: %j", async (ssh) => {
    const { service, repository } = setup();
    await expect(
      service.createServer({ ...input, deployNodeEnabled: true, ...ssh }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("encrypts SSH credentials and never returns the password", async () => {
    const { service, repository } = setup();
    const result = await service.createServer({
      ...input,
      deployNodeEnabled: true,
      sshUsername: "root",
      sshPassword: "ssh-test-password",
      sshPort: 2222,
    });
    const stored = repository.create.mock.calls[0]![0] as { sshPasswordEnc: string };
    expect(stored.sshPasswordEnc).not.toBe("ssh-test-password");
    expect(decryptSecret(stored.sshPasswordEnc)).toBe("ssh-test-password");
    expect(result).toMatchObject({
      sshPasswordConfigured: true,
      deployNodeEnabled: true,
      sshPort: 2222,
      credentialHealth: {
        panelPassword: "readable",
        apiToken: "missing",
        sshPassword: "readable",
        rotationRequired: false,
      },
    });
    expect(result).not.toHaveProperty("sshPassword");
    expect(result).not.toHaveProperty("sshPasswordEnc");
    expect(JSON.stringify(result)).not.toContain("ssh-test-password");
  });

  it("marks credentials encrypted with another key for rotation without leaking them", async () => {
    const { service } = setup({
      whmPasswordEnc: "invalid:encrypted:payload",
      sshUsername: "root",
      sshPasswordEnc: "invalid:encrypted:payload",
    });

    await expect(service.getServer("server-1")).resolves.toMatchObject({
      credentialHealth: {
        panelPassword: "unreadable",
        apiToken: "missing",
        sshPassword: "unreadable",
        rotationRequired: true,
      },
    });
  });

  it("rejects enabling Auto Deploy on an existing server without SSH", async () => {
    const { service, repository } = setup();
    await expect(
      service.updateServer("server-1", { deployNodeEnabled: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("replaces Plesk and SSH credentials encrypted before a key change", async () => {
    const originalKey = process.env.HOSTING_CREDENTIALS_KEY;
    try {
      process.env.HOSTING_CREDENTIALS_KEY = "previous-hosting-encryption-key-at-least-32-chars";
      const oldPassword = encryptSecret("old-panel-password");
      const oldSshPassword = encryptSecret("old-ssh-password");
      const oldToken = encryptSecret("old-api-token");
      process.env.HOSTING_CREDENTIALS_KEY = "current-hosting-encryption-key-at-least-32-chars";
      const { service, repository } = setup({
        whmPasswordEnc: oldPassword,
        apiTokenEnc: oldToken,
        sshUsername: "root",
        sshPasswordEnc: oldSshPassword,
      });

      const result = await service.updateServer("server-1", {
        whmPassword: " new-panel<&password> ",
        sshPassword: " new-ssh&password ",
      });
      const stored = (await repository.update.mock.results[0]!.value) as HostingServer;
      expect(decryptSecret(stored.whmPasswordEnc)).toBe(" new-panel<&password> ");
      expect(stored.apiTokenEnc).toBeNull();
      expect(resolveHostingServerSshOptions(stored).password).toBe(" new-ssh&password ");
      expect(result.credentialHealth).toEqual({
        panelPassword: "readable",
        apiToken: "missing",
        sshPassword: "readable",
        rotationRequired: false,
      });
      expect(JSON.stringify(result)).not.toContain("password");
      repository.findById.mockResolvedValue(stored);
      await expect(service.getServer("server-1")).resolves.toMatchObject({
        credentialHealth: { rotationRequired: false },
      });
    } finally {
      if (originalKey === undefined) delete process.env.HOSTING_CREDENTIALS_KEY;
      else process.env.HOSTING_CREDENTIALS_KEY = originalKey;
    }
  });

  it("uses a new Plesk password instead of a previously saved API token", async () => {
    const { service, repository } = setup({ apiTokenEnc: encryptSecret("previous-api-token") });
    await service.updateServer("server-1", { whmPassword: "replacement-panel-password" });
    expect(repository.update.mock.calls[0]![1].apiTokenEnc).toBeNull();
  });

  it("keeps an explicitly supplied new API token when both credentials are replaced", async () => {
    const { service, repository } = setup({ apiTokenEnc: "unreadable:old:token" });
    await service.updateServer("server-1", {
      whmPassword: "replacement-panel-password",
      apiToken: "replacement-api-token",
    });
    expect(decryptSecret(repository.update.mock.calls[0]![1].apiTokenEnc)).toBe(
      "replacement-api-token",
    );
  });

  it("preserves stored credentials when the password inputs are left blank", async () => {
    const { service, repository } = setup({ apiTokenEnc: encryptSecret("saved-api-token") });
    await service.updateServer("server-1", { name: "Renamed", whmPassword: "", sshPassword: "" });
    expect(repository.update.mock.calls[0]![1]).toMatchObject({
      whmPasswordEnc: undefined,
      sshPasswordEnc: undefined,
      apiTokenEnc: undefined,
    });
  });

  it("preserves the cPanel API token when only its password is updated", async () => {
    const { service, repository } = setup({
      panel: HostingPanel.CPANEL,
      apiTokenEnc: encryptSecret("cpanel-token"),
    });
    await service.updateServer("server-1", { whmPassword: "replacement-panel-password" });
    expect(repository.update.mock.calls[0]![1].apiTokenEnc).toBeUndefined();
  });

  it("keeps an existing encrypted SSH password when enabling Auto Deploy", async () => {
    const encrypted = encryptSecret("ssh-test-password");
    const { service, repository } = setup({ sshUsername: "root", sshPasswordEnc: encrypted });
    await expect(
      service.updateServer("server-1", { deployNodeEnabled: true }),
    ).resolves.toMatchObject({ sshPasswordConfigured: true });
    expect(repository.update.mock.calls[0]![1].sshPasswordEnc).toBeUndefined();
  });

  it("preserves unrelated edits on legacy deploy nodes", async () => {
    const { service } = setup({ deployNodeEnabled: true });
    await expect(service.updateServer("server-1", { name: "Updated" })).resolves.toMatchObject({
      name: "Updated",
    });
  });

  it("does not allow clearing the SSH username on an enabled node", async () => {
    const { service, repository } = setup({
      deployNodeEnabled: true,
      sshUsername: "root",
      sshPasswordEnc: encryptSecret("ssh-test-password"),
    });
    await expect(service.updateServer("server-1", { sshUsername: null })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("blocks disabling a node still used by packages or apps", async () => {
    const { service, repository } = setup({ deployNodeEnabled: true });
    repository.countDeployDependents.mockResolvedValue(1);
    await expect(
      service.updateServer("server-1", { deployNodeEnabled: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("allows disabling an unused node", async () => {
    const { service } = setup({ deployNodeEnabled: true });
    await expect(
      service.updateServer("server-1", { deployNodeEnabled: false }),
    ).resolves.toMatchObject({ deployNodeEnabled: false });
  });

  it.each(["countLinkedPlans", "countDeployDependents"] as const)(
    "blocks deleting a server with %s",
    async (method) => {
      const { service, repository } = setup();
      repository[method].mockResolvedValue(1);
      await expect(service.deleteServer("server-1")).rejects.toBeInstanceOf(ConflictException);
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it("allows deleting an unused server", async () => {
    const { service, repository } = setup();
    await expect(service.deleteServer("server-1")).resolves.toEqual({ deleted: true });
    expect(repository.delete).toHaveBeenCalledWith("server-1");
  });

  it.each([0, 65536, 22.5])("rejects invalid SSH port %s for create and update", async (port) => {
    for (const Dto of [CreateHostingServerDto, UpdateHostingServerDto]) {
      const dto = Object.assign(new Dto(), input, { sshPort: port });
      expect((await validate(dto)).some((error) => error.property === "sshPort")).toBe(true);
    }
  });
});
