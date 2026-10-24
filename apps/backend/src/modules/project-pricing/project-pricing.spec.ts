import { BadRequestException, ConflictException, ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import { defaultProjectPricing } from "@vexira/types";

import { ProjectPricingModule } from "./project-pricing.module";
import { ProjectPricingService, validateProjectPricing } from "./project-pricing.service";

import { DatabaseModule, PrismaService } from "@/database/database.module";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { JwtStrategy } from "@/modules/auth/strategies/jwt.strategy";

function store() {
  let row: { key: string; value: string; updatedAt: Date } | null = null;
  const setting = {
    findUnique: jest.fn(async () => row),
    create: jest.fn(async ({ data }: { data: { key: string; value: string } }) => {
      if (row) throw { code: "P2002" };
      row = { ...data, updatedAt: new Date() };
      return row;
    }),
    updateMany: jest.fn(
      async ({
        where,
        data,
      }: {
        where: { updatedAt: Date };
        data: { value: string; updatedAt: Date };
      }) => {
        if (!row || row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
        row = { ...row, ...data };
        return { count: 1 };
      },
    ),
  };
  const prisma = {
    systemSetting: setting,
    $transaction: (callback: (tx: { systemSetting: typeof setting }) => unknown) =>
      callback({ systemSetting: setting }),
  };
  return {
    prisma,
    setting,
    service: new ProjectPricingService(prisma as unknown as PrismaService),
  };
}
describe("project pricing persistence and validation", () => {
  it("uses independent defaults only before the first save", async () => {
    const { service } = store();
    const first = await service.get();
    first.config.packages.company.price = 1;
    expect((await service.get()).config.packages.company.price).toBe(799);
  });
  it("persists rates and discounts and reads them through a new service instance", async () => {
    const { prisma, service } = store();
    const config = defaultProjectPricing();
    config.packages.company.discount = { type: "percent", value: 10 };
    config.extraPagePrice = 45;
    const saved = await service.save({ config, expectedUpdatedAt: null });
    const read = await new ProjectPricingService(prisma as unknown as PrismaService).get();
    expect(read).toEqual(saved);
    expect(read.config.extraPagePrice).toBe(45);
  });
  it("rejects concurrent edits and first-save races without replacing stored values", async () => {
    const { service } = store();
    const config = defaultProjectPricing();
    const first = await service.save({ config, expectedUpdatedAt: null });
    const current = structuredClone(config);
    current.packages.company.price = 900;
    await service.save({ config: current, expectedUpdatedAt: first.updatedAt });
    await expect(service.save({ config, expectedUpdatedAt: first.updatedAt })).rejects.toThrow(
      ConflictException,
    );
    await expect(service.save({ config, expectedUpdatedAt: null })).rejects.toThrow(
      ConflictException,
    );
    expect((await service.get()).config.packages.company.price).toBe(900);
  });
  it.each(["negative", "nan", "percent", "amount", "unknown", "missing", "precision"])(
    "rejects invalid configuration: %s",
    (kind) => {
      const config = defaultProjectPricing();
      if (kind === "negative") config.extraPagePrice = -1;
      if (kind === "nan") config.packages.company.price = NaN;
      if (kind === "percent") config.packages.company.discount = { type: "percent", value: 101 };
      if (kind === "amount") config.packages.company.discount = { type: "amount", value: 800 };
      if (kind === "unknown") Object.assign(config.features, { injected: 1 });
      if (kind === "missing") delete (config as Partial<typeof config>).packages;
      if (kind === "precision") config.extraLanguagePrice = 0.001;
      expect(() => validateProjectPricing(config)).toThrow(BadRequestException);
    },
  );
  it("never silently substitutes default prices for corrupt saved settings", async () => {
    const { setting, service } = store();
    setting.findUnique.mockResolvedValueOnce({
      key: "project_pricing_v1",
      value: "invalid",
      updatedAt: new Date(),
    });
    await expect(service.get()).rejects.toThrow("Project pricing is temporarily unavailable");
  });
  it("recalculates a proposal from saved rates and rejects a stale displayed revision", async () => {
    const { service } = store();
    const config = defaultProjectPricing();
    config.packages.company.discount = { type: "percent", value: 10 };
    const document = await service.save({ config, expectedUpdatedAt: null });
    const selection = {
      package: "company" as const,
      pages: 7,
      languages: 3,
      features: ["api" as const],
      pricingUpdatedAt: document.updatedAt,
    };
    expect(await service.proposalSummary(selection)).toContain("TOTAL ESTIMATE: 1239.10 AZN");
    await expect(service.proposalSummary({ ...selection, pricingUpdatedAt: null })).rejects.toThrow(
      ConflictException,
    );
  });
});

describe("project pricing HTTP permissions", () => {
  let app: INestApplication;
  let base: string;
  const jwt = new JwtService({ secret: "isolated-project-pricing-http-test-secret" });
  beforeAll(async () => {
    const fixture = store();
    const module = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        ProjectPricingModule,
        PassportModule.register({ defaultStrategy: "jwt" }),
      ],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => "isolated-project-pricing-http-test-secret" },
        },
        {
          provide: AuthRepository,
          useValue: {
            findById: async (id: string) => ({
              id,
              email: `${id}@example.test`,
              role: id === "admin" ? "ADMIN" : "CUSTOMER",
              status: "ACTIVE",
            }),
          },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });
  it("allows public price reads without authentication", async () => {
    const response = await fetch(`${base}/project-pricing`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects anonymous admin reads and writes", async () => {
    expect((await fetch(`${base}/admin/project-pricing`)).status).toBe(401);
    expect((await fetch(`${base}/admin/project-pricing`, { method: "PUT" })).status).toBe(401);
  });
  it("rejects customer admin reads and writes", async () => {
    const headers = { Authorization: `Bearer ${jwt.sign({ sub: "customer" })}` };
    expect((await fetch(`${base}/admin/project-pricing`, { headers })).status).toBe(403);
    expect((await fetch(`${base}/admin/project-pricing`, { method: "PUT", headers })).status).toBe(
      403,
    );
  });
  it("lets an admin publish a discount that becomes public, and rejects invalid writes", async () => {
    const headers = {
      Authorization: `Bearer ${jwt.sign({ sub: "admin" })}`,
      "Content-Type": "application/json",
    };
    const config = defaultProjectPricing();
    config.packages.landing.discount = { type: "amount", value: 50 };
    const response = await fetch(`${base}/admin/project-pricing`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ config, expectedUpdatedAt: null }),
    });
    expect(response.status).toBe(200);
    const published = (await (await fetch(`${base}/project-pricing`)).json()) as {
      config: typeof config;
      updatedAt: string;
    };
    expect(published.config.packages.landing.discount.value).toBe(50);
    config.packages.landing.price = -1;
    expect(
      (
        await fetch(`${base}/admin/project-pricing`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ config, expectedUpdatedAt: published.updatedAt }),
        })
      ).status,
    ).toBe(400);
    expect(
      ((await (await fetch(`${base}/project-pricing`)).json()) as typeof published).config.packages
        .landing.price,
    ).toBe(399);
  });
});
