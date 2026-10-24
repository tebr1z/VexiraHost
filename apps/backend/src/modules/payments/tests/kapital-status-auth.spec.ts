import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";

import { PaymentsController } from "../controller/payments.controller";
import { PaymentsService } from "../service/payments.service";

import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { AuthRepository } from "@/modules/auth/repository/auth.repository";
import { JwtStrategy } from "@/modules/auth/strategies/jwt.strategy";

describe("Kapital status HTTP authentication", () => {
  let app: INestApplication;
  let base: string;
  let token: string;
  const status = jest.fn(async () => ({ state: "pending", invoiceId: "invoice", orderId: null }));
  beforeAll(async () => {
    const secret = "embedded-payment-auth-test-only";
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [PaymentsController],
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
              role: "CUSTOMER",
              status: "ACTIVE",
            }),
          },
        },
        { provide: PaymentsService, useValue: { getKapitalPaymentStatus: status } },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
    token = new JwtService({ secret }).sign({ sub: "customer" });
  });
  afterAll(async () => {
    await app?.close();
  });
  it("rejects anonymous requests", async () => {
    expect((await fetch(base + "/payments/kapital/pay/status")).status).toBe(401);
    expect(status).not.toHaveBeenCalled();
  });
  it("uses the authenticated user and disables caching", async () => {
    const response = await fetch(base + "/payments/kapital/pay/status", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(status).toHaveBeenCalledWith("customer", "pay");
  });
});
