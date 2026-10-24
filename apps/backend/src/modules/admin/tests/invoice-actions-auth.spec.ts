import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";

import { AdminController } from "../controller/admin.controller";
import { AdminCustomerDomainsService } from "../service/admin-customer-domains.service";
import { AdminCustomerHostingService } from "../service/admin-customer-hosting.service";
import { AdminService } from "../service/admin.service";

import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { JwtStrategy } from "@/modules/auth/strategies/jwt.strategy";
import { BalanceService } from "@/modules/payments/service/balance.service";
import { TicketsService } from "@/modules/tickets/service/tickets.service";

describe("invoice action HTTP authorization", () => {
  let app: INestApplication;
  let base: string;
  let jwt: JwtService;
  const actions = {
    voidInvoice: jest.fn(async () => ({ id: "invoice", status: "VOID" })),
    markInvoicePaid: jest.fn(async () => ({ id: "invoice", status: "PAID" })),
  };
  beforeAll(async () => {
    const secret = "invoice-action-auth-test-only";
    jwt = new JwtService({ secret });
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [AdminController],
      providers: [
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        {
          provide: AuthRepository,
          useValue: {
            findById: async (id: string) => ({
              id,
              email: "fixture@example.test",
              role: id,
              status: "ACTIVE",
            }),
          },
        },
        { provide: AdminService, useValue: actions },
        ...[
          TicketsService,
          AdminCustomerDomainsService,
          AdminCustomerHostingService,
          BalanceService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => {
    await app?.close();
  });
  it.each(["void", "mark-paid"])("requires login for %s", async (route) => {
    expect(
      (await fetch(`${base}/admin/invoices/invoice/${route}`, { method: "POST" })).status,
    ).toBe(401);
    expect(actions.voidInvoice).not.toHaveBeenCalled();
    expect(actions.markInvoicePaid).not.toHaveBeenCalled();
  });
  it.each(["void", "mark-paid"])("rejects customers for %s", async (route) => {
    expect(
      (
        await fetch(`${base}/admin/invoices/invoice/${route}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt.sign({ sub: "CUSTOMER" })}` },
        })
      ).status,
    ).toBe(403);
    expect(actions.voidInvoice).not.toHaveBeenCalled();
    expect(actions.markInvoicePaid).not.toHaveBeenCalled();
  });
  it.each([
    ["ADMIN", "void"],
    ["STAFF", "void"],
    ["ADMIN", "mark-paid"],
    ["STAFF", "mark-paid"],
  ])("allows %s to %s", async (role, route) => {
    expect(
      (
        await fetch(`${base}/admin/invoices/invoice/${route}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt.sign({ sub: role })}` },
        })
      ).status,
    ).toBe(201);
    expect(route === "void" ? actions.voidInvoice : actions.markInvoicePaid).toHaveBeenCalledWith(
      "invoice",
    );
  });
});
