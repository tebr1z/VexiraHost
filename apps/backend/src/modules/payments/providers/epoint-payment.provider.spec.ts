import { createHash } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import { EpointPaymentProvider } from "./epoint-payment.provider";

const settings = {
  publicKey: "i000000001",
  privateKey: "private-test-key",
  baseUrl: "https://epoint.example/api/1",
  returnUrl: "https://vexira.example/payment/result",
  cardReturnUrl: "https://vexira.example/dashboard/payments",
  resultUrl: "https://api.vexira.example/api/v1/payments/epoint/callback",
  language: "az",
  allowInsecure: false,
};

function provider() {
  return new EpointPaymentProvider({
    get: jest.fn().mockReturnValue(settings),
  } as never as ConfigService);
}

describe("EpointPaymentProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("verifies and decodes a signed callback", () => {
    const payload = { status: "success", code: "000", card_id: "card-1" };
    const data = Buffer.from(JSON.stringify(payload)).toString("base64");
    const signature = createHash("sha1")
      .update(`${settings.privateKey}${data}${settings.privateKey}`)
      .digest()
      .toString("base64");

    expect(provider().decodeAndVerifyCallback(data, signature)).toEqual(payload);
  });

  it("rejects callbacks with a forged signature", () => {
    const data = Buffer.from(JSON.stringify({ status: "success" })).toString("base64");
    expect(() => provider().decodeAndVerifyCallback(data, "forged")).toThrow(
      "Invalid Epoint callback signature",
    );
  });

  it("signs card registration and returns the redirect", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          card_id: "card-1",
          redirect_url: "https://epoint.example/card",
        }),
        { status: 200 },
      ),
    );

    await expect(provider().registerCard("Recurring card")).resolves.toEqual({
      cardId: "card-1",
      redirectUrl: "https://epoint.example/card",
    });
    const [, request] = fetchMock.mock.calls[0];
    const body = request?.body as URLSearchParams;
    const data = body.get("data") ?? "";
    const expectedSignature = createHash("sha1")
      .update(`${settings.privateKey}${data}${settings.privateKey}`)
      .digest()
      .toString("base64");
    expect(body.get("signature")).toBe(expectedSignature);
    expect(JSON.parse(Buffer.from(data, "base64").toString("utf8"))).toMatchObject({
      public_key: settings.publicKey,
      refund: 0,
    });
  });

  it("checks a transaction status using the signed production contract", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          code: "000",
          transaction: "te-1",
          amount: "19.90",
        }),
        { status: 200 },
      ),
    );

    await expect(provider().getPaymentStatus("te-1")).resolves.toMatchObject({
      status: "success",
      transaction: "te-1",
    });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://epoint.example/api/1/get-status");
    const body = request?.body as URLSearchParams;
    const decoded = JSON.parse(
      Buffer.from(body.get("data") ?? "", "base64").toString("utf8"),
    ) as Record<string, unknown>;
    expect(decoded).toMatchObject({ public_key: settings.publicKey, transaction: "te-1" });
  });

  it("reports production readiness and rejects insecure callback URLs", () => {
    expect(provider().getReadiness()).toMatchObject({ configured: true, ready: true, issues: [] });

    const insecure = new EpointPaymentProvider({
      get: jest.fn().mockReturnValue({
        ...settings,
        resultUrl: "http://api.vexira.example/payments/epoint/callback",
      }),
    } as never as ConfigService);
    expect(insecure.getReadiness()).toMatchObject({
      configured: true,
      ready: false,
      issues: ["EPOINT_RESULT_URL must use HTTPS"],
    });
  });
});
