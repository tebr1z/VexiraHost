import { ConfigService } from "@nestjs/config";

import { KapitalConfigService, KAPITAL_PRESETS } from "./kapital-config.service";

import { PrismaService } from "@/database/database.module";

describe("KapitalConfigService secret handling", () => {
  function createService(stored: Array<{ key: string; value: string }> = []) {
    const config = {
      getOrThrow: jest.fn().mockReturnValue({
        kapital: {
          username: "merchant-from-env",
          password: "secret-from-env",
          isDev: false,
          baseUrl: "https://e-commerce.kapitalbank.az",
          redirectUrl: "https://api.example.test/payments/callback",
          returnUrl: "https://example.test/payment/result",
          language: "az",
        },
      }),
    } as unknown as ConfigService;
    const prisma = {
      systemSetting: {
        findMany: jest.fn().mockResolvedValue(stored),
        upsert: jest.fn(),
      },
    } as unknown as PrismaService;

    return new KapitalConfigService(config, prisma);
  }

  it("never returns the resolved password to the admin client", async () => {
    const settings = await createService().getAdminSettings();

    expect(settings.password).toBe("");
    expect(settings.passwordConfigured).toBe(true);
    expect(settings.configured).toBe(true);
  });

  it("does not ship production credentials as a preset", () => {
    const service = createService();
    const presets = service.getPresets();

    expect(KAPITAL_PRESETS.production.username).toBe("");
    expect(KAPITAL_PRESETS.production.password).toBe("");
    expect(presets.production).not.toHaveProperty("password");
  });
});
