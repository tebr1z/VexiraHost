import { BadGatewayException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DnsRecordType } from "@prisma/client";

import type { ManagedDnsRecord } from "./cloudflare-dns.provider";

const SUPPORTED_TYPES = new Set<DnsRecordType>(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]);

interface PowerDnsRecord {
  content: string;
  disabled?: boolean;
}

interface PowerDnsRrset {
  name: string;
  type: DnsRecordType;
  ttl: number;
  records: PowerDnsRecord[];
}

interface PowerDnsZone {
  id: string;
  name: string;
  kind: string;
  rrsets?: PowerDnsRrset[];
}

@Injectable()
export class PowerDnsProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>("powerdns.apiUrl")?.trim() &&
      this.config.get<string>("powerdns.apiKey")?.trim(),
    );
  }

  getNameservers(): string[] {
    return (this.config.get<string[]>("powerdns.nameservers") ?? [])
      .map((value) => value.trim().toLowerCase().replace(/\.$/, ""))
      .filter(Boolean);
  }

  getMonitorDomain(): string {
    return this.config.get<string>("powerdns.monitorDomain")?.trim() || "vexirahost.com";
  }

  async checkApi(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.request<unknown>(`servers/${encodeURIComponent(this.serverId())}`);
      return true;
    } catch {
      return false;
    }
  }

  async ensureZone(domainName: string): Promise<PowerDnsZone> {
    const existing = await this.getZone(domainName);
    if (existing) return existing;

    const nameservers = this.getNameservers();
    if (nameservers.length < 2) {
      throw new ServiceUnavailableException("At least two authoritative nameservers are required");
    }

    return (await this.request<PowerDnsZone>(this.zonesPath(), {
      method: "POST",
      body: JSON.stringify({
        name: this.fqdn(domainName),
        kind: "Master",
        masters: [],
        nameservers: nameservers.map((value) => this.fqdn(value)),
      }),
    }))!;
  }

  async getZone(domainName: string): Promise<PowerDnsZone | null> {
    return this.request<PowerDnsZone>(this.zonePath(domainName), undefined, true);
  }

  async listRecords(domainName: string): Promise<ManagedDnsRecord[]> {
    const zone = await this.getZone(domainName);
    if (!zone) return [];

    const root = this.fqdn(domainName).toLowerCase();
    return (zone.rrsets ?? []).flatMap((rrset) => {
      if (!SUPPORTED_TYPES.has(rrset.type)) return [];
      if (rrset.type === "NS" && rrset.name.toLowerCase() === root) return [];

      return rrset.records
        .filter((record) => !record.disabled)
        .map((record) => this.fromPowerDnsRecord(domainName, rrset, record.content));
    });
  }

  async replaceRecords(domainName: string, desiredRecords: ManagedDnsRecord[]): Promise<void> {
    const zone = await this.ensureZone(domainName);
    const root = this.fqdn(domainName).toLowerCase();
    const current = new Map(
      (zone.rrsets ?? [])
        .filter(
          (rrset) =>
            SUPPORTED_TYPES.has(rrset.type) &&
            !(rrset.type === "NS" && rrset.name.toLowerCase() === root),
        )
        .map((rrset) => [this.rrsetKey(rrset.name, rrset.type), rrset]),
    );

    const desired = new Map<string, PowerDnsRrset>();
    for (const record of desiredRecords) {
      if (!SUPPORTED_TYPES.has(record.type)) continue;
      if (record.type === "NS" && record.name === "@") continue;

      const name = this.absoluteName(record.name, domainName);
      const key = this.rrsetKey(name, record.type);
      const rrset = desired.get(key) ?? {
        name,
        type: record.type,
        ttl: record.ttl,
        records: [],
      };
      rrset.ttl = record.ttl;
      rrset.records.push({ content: this.toPowerDnsContent(record), disabled: false });
      desired.set(key, rrset);
    }

    const rrsets: Array<PowerDnsRrset & { changetype: "REPLACE" | "DELETE" }> = [];
    for (const [key, rrset] of desired) {
      current.delete(key);
      rrsets.push({ ...rrset, changetype: "REPLACE" });
    }
    for (const rrset of current.values()) {
      rrsets.push({ ...rrset, records: [], changetype: "DELETE" });
    }

    if (rrsets.length === 0) return;
    await this.request<void>(this.zonePath(domainName), {
      method: "PATCH",
      body: JSON.stringify({ rrsets }),
    });
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
    allowNotFound = false,
  ): Promise<T | null> {
    const apiUrl = this.config.get<string>("powerdns.apiUrl")?.trim().replace(/\/$/, "");
    const apiKey = this.config.get<string>("powerdns.apiKey")?.trim();
    if (!apiUrl || !apiKey) {
      throw new ServiceUnavailableException("PowerDNS authoritative service is not configured");
    }

    let response: Response;
    try {
      response = await fetch(`${apiUrl}/${path.replace(/^\//, "")}`, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
    } catch (error) {
      throw new BadGatewayException(
        `PowerDNS API is unreachable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new BadGatewayException(
        payload?.error || `PowerDNS API returned HTTP ${response.status}`,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private zonesPath(): string {
    return `servers/${encodeURIComponent(this.serverId())}/zones`;
  }

  private zonePath(domainName: string): string {
    return `${this.zonesPath()}/${encodeURIComponent(this.fqdn(domainName))}`;
  }

  private serverId(): string {
    return this.config.get<string>("powerdns.serverId")?.trim() || "localhost";
  }

  private fqdn(value: string): string {
    return `${value.trim().toLowerCase().replace(/\.$/, "")}.`;
  }

  private absoluteName(name: string, domainName: string): string {
    const normalized = name.trim().toLowerCase().replace(/\.$/, "");
    if (!normalized || normalized === "@") return this.fqdn(domainName);
    if (normalized === domainName || normalized.endsWith(`.${domainName}`)) {
      return this.fqdn(normalized);
    }
    return this.fqdn(`${normalized}.${domainName}`);
  }

  private relativeName(name: string, domainName: string): string {
    const normalized = name.toLowerCase().replace(/\.$/, "");
    if (normalized === domainName) return "@";
    if (normalized.endsWith(`.${domainName}`)) {
      return normalized.slice(0, -(domainName.length + 1));
    }
    return normalized;
  }

  private rrsetKey(name: string, type: DnsRecordType): string {
    return `${name.toLowerCase()}|${type}`;
  }

  private toPowerDnsContent(record: ManagedDnsRecord): string {
    if (["CNAME", "NS"].includes(record.type)) return this.fqdn(record.value);
    if (record.type === "MX") return `${record.priority ?? 0} ${this.fqdn(record.value)}`;
    if (record.type === "TXT") {
      return `"${record.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return record.value;
  }

  private fromPowerDnsRecord(
    domainName: string,
    rrset: PowerDnsRrset,
    content: string,
  ): ManagedDnsRecord {
    if (rrset.type === "MX") {
      const match = content.match(/^(\d+)\s+(.+)$/);
      return {
        type: rrset.type,
        name: this.relativeName(rrset.name, domainName),
        value: (match?.[2] ?? content).replace(/\.$/, ""),
        ttl: rrset.ttl,
        priority: Number(match?.[1] ?? 0),
      };
    }

    const value =
      rrset.type === "TXT"
        ? content.replace(/^"|"$/g, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
        : ["CNAME", "NS"].includes(rrset.type)
          ? content.replace(/\.$/, "")
          : content;
    return {
      type: rrset.type,
      name: this.relativeName(rrset.name, domainName),
      value,
      ttl: rrset.ttl,
      priority: null,
    };
  }
}
