import { ServiceUnavailableException } from "@nestjs/common";

import { RegistrarService } from "./registrar.service";

function setup(storedProvider: string | null, namesiloConfigured = true) {
  const prisma = {
    systemSetting: {
      findUnique: jest
        .fn()
        .mockResolvedValue(storedProvider == null ? null : { value: storedProvider }),
    },
  };
  const config = { get: jest.fn().mockReturnValue("mock") };
  const mock = {
    search: jest.fn().mockResolvedValue([{ domain: "mock.example" }]),
    defaultDnsRecords: jest.fn().mockReturnValue([{ type: "A", name: "@", value: "203.0.113.10" }]),
  };
  const namesilo = {
    isConfigured: jest.fn().mockReturnValue(namesiloConfigured),
    search: jest.fn().mockResolvedValue([{ domain: "live.example" }]),
  };
  type Args = ConstructorParameters<typeof RegistrarService>;
  const service = new RegistrarService(
    prisma as unknown as Args[0],
    config as unknown as Args[1],
    mock as unknown as Args[2],
    namesilo as unknown as Args[3],
  );
  return { service, mock, namesilo };
}

describe("RegistrarService", () => {
  it("uses the admin-selected NameSilo provider", async () => {
    const { service, mock, namesilo } = setup("namesilo");
    await expect(service.search("example.com")).resolves.toEqual([{ domain: "live.example" }]);
    expect(namesilo.search).toHaveBeenCalledWith("example.com");
    expect(mock.search).not.toHaveBeenCalled();
  });

  it("supports the legacy real provider alias", async () => {
    const { service, namesilo } = setup("real");
    await service.search("example.com");
    expect(namesilo.search).toHaveBeenCalled();
  });

  it("fails closed when NameSilo is selected without credentials", async () => {
    const { service } = setup("namesilo", false);
    await expect(service.search("example.com")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("keeps deterministic platform DNS defaults independent of the active registrar", () => {
    const { service, mock } = setup("namesilo");
    expect(service.defaultDnsRecords("example.com")).toEqual([
      { type: "A", name: "@", value: "203.0.113.10" },
    ]);
    expect(mock.defaultDnsRecords).toHaveBeenCalledWith("example.com");
  });
});
