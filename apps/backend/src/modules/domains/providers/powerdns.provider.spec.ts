import { ConfigService } from "@nestjs/config";

import { PowerDnsProvider } from "./powerdns.provider";

function jsonResponse(result: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(result),
  } as unknown as Response;
}

describe("PowerDnsProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function provider() {
    const config = {
      get: jest.fn((key: string) => {
        if (key === "powerdns.apiUrl") return "https://dns-api.example/api/v1";
        if (key === "powerdns.apiKey") return "secret";
        if (key === "powerdns.serverId") return "localhost";
        if (key === "powerdns.nameservers") {
          return ["ns1.vexirahost.com", "ns2.vexirahost.com"];
        }
        return undefined;
      }),
    } as unknown as ConfigService;
    return new PowerDnsProvider(config);
  }

  it("creates a missing native zone with the Vexira nameservers", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(
        jsonResponse({ id: "example.com.", name: "example.com.", kind: "Native", rrsets: [] }, 201),
      );

    await provider().ensureZone("example.com");

    const [, request] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toEqual(
      expect.objectContaining({
        name: "example.com.",
        kind: "Master",
        nameservers: ["ns1.vexirahost.com.", "ns2.vexirahost.com."],
      }),
    );
  });

  it("replaces application records without deleting the authoritative apex NS set", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "example.com.",
          name: "example.com.",
          kind: "Native",
          rrsets: [
            {
              name: "example.com.",
              type: "NS",
              ttl: 3600,
              records: [{ content: "ns1.vexirahost.com.", disabled: false }],
            },
            {
              name: "old.example.com.",
              type: "A",
              ttl: 300,
              records: [{ content: "192.0.2.1", disabled: false }],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(null, 204));

    await provider().replaceRecords("example.com", [
      { type: "A", name: "@", value: "203.0.113.10", ttl: 300 },
      {
        type: "MX",
        name: "@",
        value: "mail.example.com",
        ttl: 300,
        priority: 10,
      },
    ]);

    const [, request] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as {
      rrsets: Array<{ name: string; type: string; changetype: string; records: PowerDnsRecord[] }>;
    };
    expect(body.rrsets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "example.com.", type: "A", changetype: "REPLACE" }),
        expect.objectContaining({
          name: "example.com.",
          type: "MX",
          records: [{ content: "10 mail.example.com.", disabled: false }],
        }),
        expect.objectContaining({ name: "old.example.com.", type: "A", changetype: "DELETE" }),
      ]),
    );
    expect(body.rrsets).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "NS", changetype: "DELETE" })]),
    );
  });
});

interface PowerDnsRecord {
  content: string;
  disabled?: boolean;
}
