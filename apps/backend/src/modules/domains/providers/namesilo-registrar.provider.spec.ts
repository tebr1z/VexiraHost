import { ConfigService } from "@nestjs/config";

import { NameSiloRegistrarProvider } from "./namesilo-registrar.provider";

function setup(reply: Record<string, unknown>) {
  const values: Record<string, unknown> = {
    "registrar.namesilo.apiKey": "test-api-key",
    "registrar.namesilo.apiBaseUrl": "https://sandbox.namesilo.test/api",
    "registrar.namesilo.contactId": "12345",
    "registrar.namesilo.defaultNameservers": ["ns1.vexirahost.com", "ns2.vexirahost.com"],
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback),
  } as unknown as ConfigService;
  const pricing = {
    listActive: jest.fn().mockResolvedValue([
      { tld: "com", registerPrice: 12.5 },
      { tld: "net", registerPrice: 14 },
    ]),
  };
  const fetchMock = jest.spyOn(global, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify({ reply: { code: 300, detail: "success", ...reply } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  const provider = new NameSiloRegistrarProvider(config, pricing as never);
  return { provider, fetchMock };
}

afterEach(() => jest.restoreAllMocks());

describe("NameSiloRegistrarProvider", () => {
  it("maps live availability and local retail prices", async () => {
    const { provider, fetchMock } = setup({
      available: { domain: [{ domain: "vexira-demo.com" }] },
      unavailable: { domain: "vexira-demo.net" },
    });

    await expect(provider.search("vexira-demo")).resolves.toEqual([
      {
        domain: "vexira-demo.com",
        tld: "com",
        available: true,
        price: 12.5,
        currency: "USD",
        premium: false,
      },
      {
        domain: "vexira-demo.net",
        tld: "net",
        available: false,
        price: 14,
        currency: "USD",
        premium: false,
      },
    ]);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/checkRegisterAvailability");
    expect(url.searchParams.get("domains")).toBe("vexira-demo.com,vexira-demo.net");
  });

  it("registers with Vexira nameservers, privacy and registrar-side auto-renew disabled", async () => {
    const { provider, fetchMock } = setup({ domain: "vexira-demo.com" });

    await expect(provider.register("vexira-demo.com")).resolves.toMatchObject({
      registrarRef: "namesilo:vexira-demo.com",
      nameservers: ["ns1.vexirahost.com", "ns2.vexirahost.com"],
    });
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/registerDomain");
    expect(url.searchParams.get("auto_renew")).toBe("0");
    expect(url.searchParams.get("private")).toBe("1");
    expect(url.searchParams.get("ns1")).toBe("ns1.vexirahost.com");
    expect(url.searchParams.get("ns2")).toBe("ns2.vexirahost.com");
  });

  it("base64 encodes transfer authorization codes", async () => {
    const { provider, fetchMock } = setup({ domain: "vexira-demo.com" });

    await provider.initiateTransfer("vexira-demo.com", "secret-code");
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/transferDomain");
    expect(url.searchParams.get("auth")).toBe(
      `base64:${Buffer.from("secret-code").toString("base64")}`,
    );
  });

  it("sends live nameserver and glue operations", async () => {
    const { provider, fetchMock } = setup({ domain: "vexira-demo.com" });

    await provider.updateNameservers("vexira-demo.com", [
      "ns1.vexirahost.com",
      "ns2.vexirahost.com",
    ]);
    await provider.registerGlue("vexira-demo.com", "ns1.vexira-demo.com", "192.0.2.10");

    const nameserverUrl = new URL(String(fetchMock.mock.calls[0]![0]));
    const glueUrl = new URL(String(fetchMock.mock.calls[1]![0]));
    expect(nameserverUrl.pathname).toBe("/api/changeNameServers");
    expect(nameserverUrl.searchParams.get("ns2")).toBe("ns2.vexirahost.com");
    expect(glueUrl.pathname).toBe("/api/addRegisteredNameServer");
    expect(glueUrl.searchParams.get("new_host")).toBe("ns1.vexira-demo.com");
    expect(glueUrl.searchParams.get("ip1")).toBe("192.0.2.10");
  });
});
