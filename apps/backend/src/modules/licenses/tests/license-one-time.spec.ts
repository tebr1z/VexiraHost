import { BadRequestException } from "@nestjs/common";

import { LicensesRepository } from "../repository/licenses.repository";
import { AddonExpiryJobService } from "../service/addon-expiry-job.service";
import { LicensesService } from "../service/licenses.service";

describe("license keys do not renew or expire as subscriptions", () => {
  it("stores new keys with renewal disabled and no platform expiry", async () => {
    const create = jest.fn().mockResolvedValue({ id: "key" });
    const repository = new LicensesRepository({
      addonService: { create },
    } as unknown as ConstructorParameters<typeof LicensesRepository>[0]);
    await repository.createAddon({
      userId: "test-user",
      type: "LICENSE",
      name: "Key",
      status: "PROVISIONING",
      expiresAt: new Date(),
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ autoRenew: false, expiresAt: null }),
    });
  });
  it("does not cancel a one-time key when an old client calls cancel-renewal", async () => {
    const updateAddon = jest.fn();
    type Args = ConstructorParameters<typeof LicensesService>;
    const service = new LicensesService(
      {
        findByIdForUser: jest
          .fn()
          .mockResolvedValue({ id: "key", type: "LICENSE", status: "ACTIVE" }),
        updateAddon,
      } as unknown as Args[0],
      {} as Args[1],
      {} as Args[2],
      {} as Args[3],
    );
    await expect(service.cancelRenewal("key", "test-user")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(updateAddon).not.toHaveBeenCalled();
  });
  it("ignores provider-supplied subscription expiry when provisioning a license", async () => {
    const updateAddon = jest
      .fn()
      .mockImplementation(async (_id, data) => ({ id: "key", type: "LICENSE", ...data }));
    type Args = ConstructorParameters<typeof LicensesService>;
    const service = new LicensesService(
      {
        createAddon: jest.fn().mockResolvedValue({ id: "key", type: "LICENSE" }),
        updateAddon,
      } as unknown as Args[0],
      {
        provision: jest.fn().mockResolvedValue({
          identifier: "TEST-KEY",
          status: "ACTIVE",
          expiresAt: new Date("2030-01-01"),
          metadata: {},
        }),
      } as unknown as Args[1],
      {} as Args[2],
      { get: jest.fn().mockReturnValue("http://localhost:3000") } as unknown as Args[3],
    );
    await expect(
      service.provision("test-user", { type: "LICENSE", name: "Key" }),
    ).resolves.toMatchObject({ autoRenew: false, expiresAt: null });
    expect(updateAddon).toHaveBeenCalledWith(
      "key",
      expect.objectContaining({ autoRenew: false, expiresAt: null }),
    );
  });
  it("excludes license keys from the subscription expiry worker", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    await new AddonExpiryJobService({
      addonService: { updateMany },
    } as unknown as ConstructorParameters<typeof AddonExpiryJobService>[0]).tick();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: { not: "LICENSE" } }) }),
    );
  });
});
