import { isIP } from "node:net";

import { BadRequestException } from "@nestjs/common";
import type { DnsRecordType } from "@prisma/client";

export interface NormalizedDnsRecord {
  type: DnsRecordType;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  proxied: boolean;
}

const HOSTNAME_PATTERN =
  /^(?:\*\.)?(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)*[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.?$/i;

export function normalizeDnsRecords(
  records: Array<{
    type: DnsRecordType;
    name: string;
    value: string;
    ttl: number;
    priority?: number;
    proxied?: boolean;
  }>,
): NormalizedDnsRecord[] {
  const normalized = records.map((record) => ({
    type: record.type,
    name: record.name.trim().toLowerCase().replace(/\.$/, "") || "@",
    value: record.value.trim(),
    ttl: record.ttl,
    ...(record.type === "MX" ? { priority: record.priority ?? 0 } : {}),
    proxied: ["A", "AAAA", "CNAME"].includes(record.type) && record.proxied === true,
  }));

  const seen = new Set<string>();
  const typesByName = new Map<string, Set<DnsRecordType>>();

  for (const record of normalized) {
    if (!record.value) throw new BadRequestException("DNS record value cannot be empty");
    if (record.name !== "@" && !HOSTNAME_PATTERN.test(record.name)) {
      throw new BadRequestException(`Invalid DNS record name: ${record.name}`);
    }
    if (record.type === "A" && isIP(record.value) !== 4) {
      throw new BadRequestException(`A record requires a valid IPv4 address: ${record.name}`);
    }
    if (record.type === "AAAA" && isIP(record.value) !== 6) {
      throw new BadRequestException(`AAAA record requires a valid IPv6 address: ${record.name}`);
    }
    if (["CNAME", "MX", "NS"].includes(record.type)) {
      const target = record.value.replace(/\.$/, "");
      if (!HOSTNAME_PATTERN.test(target)) {
        throw new BadRequestException(`${record.type} record requires a valid hostname`);
      }
    }

    const duplicateKey = [record.type, record.name, record.value, record.priority ?? ""].join("|");
    if (seen.has(duplicateKey)) {
      throw new BadRequestException(`Duplicate DNS record: ${record.type} ${record.name}`);
    }
    seen.add(duplicateKey);

    const types = typesByName.get(record.name) ?? new Set<DnsRecordType>();
    types.add(record.type);
    typesByName.set(record.name, types);
  }

  for (const [name, types] of typesByName) {
    if (types.has("CNAME") && types.size > 1) {
      throw new BadRequestException(`CNAME cannot coexist with other records at ${name}`);
    }
    if (types.has("NS") && types.size > 1) {
      throw new BadRequestException(`NS cannot coexist with other records at ${name}`);
    }
  }

  return normalized;
}
