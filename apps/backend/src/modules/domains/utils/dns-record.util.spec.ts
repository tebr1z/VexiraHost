import { normalizeDnsRecords } from "./dns-record.util";

describe("normalizeDnsRecords", () => {
  it("normalizes names and supplies MX priority", () => {
    expect(
      normalizeDnsRecords([{ type: "MX", name: " Mail. ", value: "mx.example.com.", ttl: 300 }]),
    ).toEqual([
      {
        type: "MX",
        name: "mail",
        value: "mx.example.com.",
        ttl: 300,
        priority: 0,
        proxied: false,
      },
    ]);
  });

  it("keeps proxy enabled only for Cloudflare-proxyable records", () => {
    expect(
      normalizeDnsRecords([
        { type: "A", name: "@", value: "192.0.2.1", ttl: 300, proxied: true },
        { type: "TXT", name: "verify", value: "ok", ttl: 300, proxied: true },
      ]),
    ).toEqual([
      { type: "A", name: "@", value: "192.0.2.1", ttl: 300, proxied: true },
      { type: "TXT", name: "verify", value: "ok", ttl: 300, proxied: false },
    ]);
  });

  it("rejects invalid IPv4 values", () => {
    expect(() =>
      normalizeDnsRecords([{ type: "A", name: "@", value: "999.1.1.1", ttl: 300 }]),
    ).toThrow("valid IPv4");
  });

  it("rejects CNAME conflicts", () => {
    expect(() =>
      normalizeDnsRecords([
        { type: "CNAME", name: "www", value: "example.com", ttl: 300 },
        { type: "A", name: "www", value: "192.0.2.1", ttl: 300 },
      ]),
    ).toThrow("CNAME cannot coexist");
  });
});
