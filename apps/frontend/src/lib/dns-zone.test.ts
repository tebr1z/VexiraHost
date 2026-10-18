import { describe, expect, it } from "vitest";

import { formatDnsZone, parseDnsZone } from "./dns-zone";

describe("DNS zone import/export", () => {
  it("preserves MX priority", () => {
    const text = formatDnsZone([
      { type: "MX", name: "@", value: "mail.example.com", ttl: 300, priority: 10 },
    ]);

    expect(parseDnsZone(text)).toEqual([
      { type: "MX", name: "@", value: "mail.example.com", ttl: 300, priority: 10 },
    ]);
  });

  it("preserves TXT values containing spaces", () => {
    const text = formatDnsZone([
      { type: "TXT", name: "@", value: "v=spf1 include:example.com -all", ttl: 3600 },
    ]);

    expect(parseDnsZone(text)[0]?.value).toBe("v=spf1 include:example.com -all");
  });
});
