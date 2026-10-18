import { createHash } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import { EpointPaymentProvider } from "./epoint-payment.provider";

const settings = {
  publicKey: "i000000001",
  privateKey: "private-test-key",
  baseUrl: "https://epoint.example/api/1",
  returnUrl: "https://vexira.example/payment/result",
  cardReturnUrl: "https://vexira.example/dashboard/payments",
  language: "az",
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
});
