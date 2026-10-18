import { resolveNs } from "node:dns/promises";
import { isIP } from "node:net";

import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  DnsProvider,
  DomainManagementMode,
  DomainStatus,
  type DnsRecordType,
} from "@prisma/client";

import type { ManagedDnsRecord } from "../providers/cloudflare-dns.provider";
import { PowerDnsProvider } from "../providers/powerdns.provider";
import { normalizeDnsRecords } from "../utils/dns-record.util";

import { PrismaService } from "@/database/database.module";

function normalizeNameserver(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}

function uniqueNameservers(values: string[]): string[] {
  return [...new Set(values.map(normalizeNameserver).filter(Boolean))].sort();
}

@Injectable()
export class AuthoritativeDnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly powerDns: PowerDnsProvider,
  ) {}

  isConfigured(): boolean {
    return this.powerDns.isConfigured();
  }

  getNameservers(): string[] {
    return this.powerDns.getNameservers();
  }

  async verifyNameserverDelegation(domainName: string, configured: string[] = []) {
    const domain = domainName.trim().toLowerCase().replace(/\.+$/, "");
    const requiredNameservers = uniqueNameservers(this.getNameservers());
    const configuredNameservers = uniqueNameservers(configured);
    let detectedNameservers: string[] = [];
    let lookupStatus: "OK" | "PENDING" | "ERROR" = "OK";
    let lookupError: string | null = null;

    try {
      detectedNameservers = uniqueNameservers(await resolveNs(domain));
      if (detectedNameservers.length === 0) lookupStatus = "PENDING";
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "DNS_LOOKUP_FAILED";
      lookupError = code;
      lookupStatus = code === "ENODATA" || code === "ENOTFOUND" ? "PENDING" : "ERROR";
    }

    const missingNameservers = requiredNameservers.filter(
      (nameserver) => !detectedNameservers.includes(nameserver),
    );
    const unexpectedNameservers = detectedNameservers.filter(
      (nameserver) => !requiredNameservers.includes(nameserver),
    );
    const isUsingVexiraNameservers =
      requiredNameservers.length >= 2 &&
      missingNameservers.length === 0 &&
      unexpectedNameservers.length === 0;

    return {
      domain,
      requiredNameservers,
      configuredNameservers,
      detectedNameservers,
      missingNameservers,
      unexpectedNameservers,
      isUsingVexiraNameservers,
      lookupStatus,
      lookupError,
      checkedAt: new Date(),
    };
  }

  async replaceRecords(domainName: string, records: ManagedDnsRecord[]): Promise<void> {
    await this.powerDns.replaceRecords(domainName, records);
  }

  async provisionHostingZone(input: {
    userId: string;
    domainName: string;
    serverAddress: string;
  }): Promise<{ configured: boolean; provider: DnsProvider; nameservers: string[] }> {
    if (!this.isConfigured()) {
      return { configured: false, provider: DnsProvider.LOCAL, nameservers: [] };
    }

    const domainName = input.domainName.trim().toLowerCase();
    const serverIp = this.extractIp(input.serverAddress);
    const nameservers = this.getNameservers();
    if (nameservers.length < 2) {
      throw new BadRequestException("At least two authoritative nameservers are required");
    }

    let domain = await this.prisma.domain.findUnique({
      where: { name: domainName },
      include: { dnsRecords: true },
    });
    if (domain && domain.userId !== input.userId) {
      throw new ConflictException("Domain belongs to another customer");
    }
    if (domain?.dnsProvider === DnsProvider.CLOUDFLARE) {
      return {
        configured: true,
        provider: DnsProvider.CLOUDFLARE,
        nameservers: domain.nameservers,
      };
    }

    if (!domain) {
      domain = await this.prisma.domain.create({
        data: {
          userId: input.userId,
          name: domainName,
          tld: domainName.split(".").pop() ?? "com",
          status: DomainStatus.ACTIVE,
          managementMode: DomainManagementMode.MANUAL,
          registrarSource: "external-hosting",
          adminNotes: "Automatically added when hosting was provisioned.",
          autoRenew: false,
          nameservers,
          dnsProvider: DnsProvider.POWERDNS,
          dnsZoneRef: domainName,
          dnsProviderStatus: "provisioning",
        },
        include: { dnsRecords: true },
      });
    }

    const records = this.buildHostingRecords(domain.dnsRecords, domainName, serverIp);
    await this.powerDns.replaceRecords(domainName, records);
    const syncedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.dnsRecord.deleteMany({ where: { domainId: domain!.id } });
      await tx.dnsRecord.createMany({
        data: records.map((record) => ({
          domainId: domain!.id,
          type: record.type,
          name: record.name,
          value: record.value,
          ttl: record.ttl,
          priority: record.priority,
          proxied: false,
        })),
      });
      await tx.domain.update({
        where: { id: domain!.id },
        data: {
          nameservers,
          dnsProvider: DnsProvider.POWERDNS,
          dnsZoneRef: domainName,
          dnsProviderStatus: "active",
          dnsLastSyncedAt: syncedAt,
        },
      });
    });

    return { configured: true, provider: DnsProvider.POWERDNS, nameservers };
  }

  private buildHostingRecords(
    existing: Array<{
      type: DnsRecordType;
      name: string;
      value: string;
      ttl: number;
      priority: number | null;
      proxied: boolean;
    }>,
    domainName: string,
    serverIp: string,
  ): ManagedDnsRecord[] {
    const addressType: DnsRecordType = isIP(serverIp) === 6 ? "AAAA" : "A";
    const managedSlots = new Set([
      `A|@`,
      `AAAA|@`,
      `A|www`,
      `AAAA|www`,
      `CNAME|www`,
      `A|mail`,
      `AAAA|mail`,
      `MX|@`,
    ]);
    const preserved = existing.filter(
      (record) => !managedSlots.has(`${record.type}|${record.name.toLowerCase()}`),
    );
    const hasSpf = preserved.some(
      (record) => record.type === "TXT" && record.value.toLowerCase().startsWith("v=spf1"),
    );

    return normalizeDnsRecords([
      ...preserved.map((record) => ({
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority ?? undefined,
        proxied: false,
      })),
      { type: addressType, name: "@", value: serverIp, ttl: 300, proxied: false },
      { type: "CNAME", name: "www", value: domainName, ttl: 300, proxied: false },
      { type: addressType, name: "mail", value: serverIp, ttl: 300, proxied: false },
      {
        type: "MX",
        name: "@",
        value: `mail.${domainName}`,
        ttl: 300,
        priority: 10,
        proxied: false,
      },
      ...(!hasSpf
        ? [
            {
              type: "TXT" as const,
              name: "@",
              value: "v=spf1 a mx ~all",
              ttl: 300,
              proxied: false,
            },
          ]
        : []),
    ]);
  }

  private extractIp(value: string): string {
    const trimmed = value.trim();
    if (isIP(trimmed)) return trimmed;

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const hostname = new URL(trimmed).hostname;
        if (isIP(hostname)) return hostname;
      } catch {
        /* handled below */
      }
    }

    const bracketed = trimmed.match(/^\[([\da-f:]+)](?::\d+)?$/i)?.[1];
    if (bracketed && isIP(bracketed)) return bracketed;
    const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/)?.[1];
    if (ipv4WithPort && isIP(ipv4WithPort) === 4) return ipv4WithPort;

    throw new BadRequestException("Hosting server must have a public IPv4 or IPv6 address for DNS");
  }
}
