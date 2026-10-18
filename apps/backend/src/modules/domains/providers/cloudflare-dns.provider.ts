import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DnsRecordType } from "@prisma/client";

const SUPPORTED_TYPES = new Set<DnsRecordType>(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]);

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
}

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  name_servers?: string[];
}

interface CloudflareDnsRecord {
  id: string;
  type: DnsRecordType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

export interface ManagedDnsRecord {
  type: DnsRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number | null;
  proxied?: boolean;
}

@Injectable()
export class CloudflareDnsProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("cloudflare.apiToken")?.trim());
  }

  canCreateZones(): boolean {
    return this.isConfigured() && Boolean(this.config.get<string>("cloudflare.accountId")?.trim());
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.config.get<string>("cloudflare.apiToken")?.trim();
    if (!token) {
      throw new ServiceUnavailableException("Cloudflare DNS is not configured");
    }

    const baseUrl = (
      this.config.get<string>("cloudflare.apiBaseUrl") ?? "https://api.cloudflare.com/client/v4"
    ).replace(/\/$/, "");

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/${path.replace(/^\//, "")}`, {
        ...init,
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    } catch (error) {
      throw new BadGatewayException(
        `Cloudflare API is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as CloudflareEnvelope<T> | null;
    if (!response.ok || !payload?.success) {
      const message = payload?.errors
        ?.map((item) => item.message)
        .filter(Boolean)
        .join("; ");
      throw new BadGatewayException(message || `Cloudflare API returned HTTP ${response.status}`);
    }
    return payload.result;
  }

  async ensureZone(domainName: string): Promise<CloudflareZone> {
    const zones = await this.request<CloudflareZone[]>(
      `zones?name=${encodeURIComponent(domainName)}&match=all&per_page=1`,
    );
    const existing = zones.find((zone) => zone.name.toLowerCase() === domainName.toLowerCase());
    if (existing) return existing;

    const accountId = this.config.get<string>("cloudflare.accountId")?.trim();
    if (!accountId) {
      throw new ServiceUnavailableException(
        "Cloudflare account id is required to create a new zone",
      );
    }

    return this.request<CloudflareZone>("zones", {
      method: "POST",
      body: JSON.stringify({ name: domainName, account: { id: accountId }, type: "full" }),
    });
  }

  getZone(zoneId: string): Promise<CloudflareZone> {
    return this.request<CloudflareZone>(`zones/${encodeURIComponent(zoneId)}`);
  }

  async listRecords(zoneId: string, domainName: string): Promise<ManagedDnsRecord[]> {
    const records = await this.request<CloudflareDnsRecord[]>(
      `zones/${encodeURIComponent(zoneId)}/dns_records?per_page=5000`,
    );
    return records
      .filter((record) => SUPPORTED_TYPES.has(record.type))
      .map((record) => ({
        type: record.type,
        name: this.toRelativeName(record.name, domainName),
        value: record.content,
        ttl: record.ttl === 1 ? 3600 : record.ttl,
        priority: record.priority ?? null,
        proxied: record.proxied === true,
      }));
  }

  async replaceRecords(
    zoneId: string,
    domainName: string,
    desiredRecords: ManagedDnsRecord[],
  ): Promise<void> {
    const path = `zones/${encodeURIComponent(zoneId)}/dns_records`;
    const remote = (await this.request<CloudflareDnsRecord[]>(`${path}?per_page=5000`)).filter(
      (record) =>
        SUPPORTED_TYPES.has(record.type) &&
        (record.name === domainName || record.name.endsWith(`.${domainName}`)),
    );
    const unused = new Map(remote.map((record) => [record.id, record]));

    for (const desired of desiredRecords) {
      const name = this.toAbsoluteName(desired.name, domainName);
      const proxyable = ["A", "AAAA", "CNAME"].includes(desired.type);
      const exact = remote.find(
        (record) =>
          unused.has(record.id) &&
          record.type === desired.type &&
          record.name.toLowerCase() === name &&
          record.content === desired.value &&
          (record.priority ?? null) === (desired.priority ?? null),
      );
      const sameSlot =
        exact ??
        remote.find(
          (record) =>
            unused.has(record.id) &&
            record.type === desired.type &&
            record.name.toLowerCase() === name,
        );
      const body = {
        type: desired.type,
        name,
        content: desired.value,
        ttl: proxyable && desired.proxied === true ? 1 : desired.ttl,
        ...(desired.type === "MX" ? { priority: desired.priority ?? 0 } : {}),
        ...(proxyable ? { proxied: desired.proxied === true } : {}),
      };

      if (sameSlot) {
        unused.delete(sameSlot.id);
        const unchanged =
          sameSlot.content === desired.value &&
          (proxyable && desired.proxied === true
            ? sameSlot.ttl === 1
            : sameSlot.ttl === desired.ttl || (sameSlot.ttl === 1 && desired.ttl === 3600)) &&
          (sameSlot.priority ?? null) === (desired.priority ?? null) &&
          (!proxyable || sameSlot.proxied === (desired.proxied === true));
        if (!unchanged) {
          await this.request(`${path}/${encodeURIComponent(sameSlot.id)}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
        }
      } else {
        await this.request(path, { method: "POST", body: JSON.stringify(body) });
      }
    }

    for (const record of unused.values()) {
      await this.request(`${path}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
    }
  }

  private toAbsoluteName(name: string, domainName: string): string {
    const normalized = name.trim().toLowerCase().replace(/\.$/, "");
    if (!normalized || normalized === "@") return domainName;
    if (normalized === domainName || normalized.endsWith(`.${domainName}`)) return normalized;
    return `${normalized}.${domainName}`;
  }

  private toRelativeName(name: string, domainName: string): string {
    const normalized = name.toLowerCase().replace(/\.$/, "");
    if (normalized === domainName) return "@";
    if (normalized.endsWith(`.${domainName}`)) {
      return normalized.slice(0, -(domainName.length + 1));
    }
    return normalized;
  }
}
