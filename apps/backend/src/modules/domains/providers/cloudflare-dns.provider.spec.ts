import { ConfigService } from "@nestjs/config";

import { CloudflareDnsProvider } from "./cloudflare-dns.provider";

function response<T>(result: T): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ success: true, result }),
  } as unknown as Response;
}

describe("CloudflareDnsProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("finds an existing zone without creating a duplicate", async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === "cloudflare.apiToken") return "token";
        if (key === "cloudflare.apiBaseUrl") return "https://api.cloudflare.test/client/v4";
        return "";
      }),
    } as unknown as ConfigService;
    const provider = new CloudflareDnsProvider(config);
    global.fetch = jest
      .fn()
      .mockResolvedValue(response([{ id: "zone-1", name: "example.com", status: "active" }]));

    await expect(provider.ensureZone("example.com")).resolves.toEqual(
      expect.objectContaining({ id: "zone-1" }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("maps Cloudflare record names back to relative DNS names", async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === "cloudflare.apiToken" ? "token" : "https://api.cloudflare.test/client/v4",
      ),
    } as unknown as ConfigService;
    const provider = new CloudflareDnsProvider(config);
    global.fetch = jest.fn().mockResolvedValue(
      response([
        {
          id: "record-1",
          type: "A",
          name: "example.com",
          content: "192.0.2.10",
          ttl: 1,
        },
        {
          id: "record-2",
          type: "CNAME",
          name: "www.example.com",
          content: "example.com",
          ttl: 300,
        },
      ]),
    );

    await expect(provider.listRecords("zone-1", "example.com")).resolves.toEqual([
      expect.objectContaining({ name: "@", ttl: 3600, proxied: false }),
      expect.objectContaining({ name: "www", ttl: 300, proxied: false }),
    ]);
  });

  it("updates an existing record when only its proxy setting changes", async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === "cloudflare.apiToken" ? "token" : "https://api.cloudflare.test/client/v4",
      ),
    } as unknown as ConfigService;
    const provider = new CloudflareDnsProvider(config);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        response([
          {
            id: "record-1",
            type: "A",
            name: "example.com",
            content: "192.0.2.10",
            ttl: 300,
            proxied: false,
          },
        ]),
      )
      .mockResolvedValueOnce(response({}));

    await provider.replaceRecords("zone-1", "example.com", [
      {
        type: "A",
        name: "@",
        value: "192.0.2.10",
        ttl: 300,
        proxied: true,
      },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const [, updateRequest] = (global.fetch as jest.Mock).mock.calls[1] as [string, RequestInit];
    expect(updateRequest.method).toBe("PATCH");
    expect(JSON.parse(String(updateRequest.body))).toEqual(
      expect.objectContaining({ proxied: true }),
    );
  });
});
