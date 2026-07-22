import type { DnsRecord } from "@/features/domains";

const RECORD_TYPES = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]);

/** Export DNS records as zone-style lines: TYPE name value [ttl] */
export function formatDnsZone(records: DnsRecord[]): string {
  return records
    .map((record) => {
      const ttl = record.ttl ?? 3600;
      return `${record.type}\t${record.name}\t${record.value}\t${ttl}`;
    })
    .join("\n");
}

/** Parse zone-style or CSV lines into DNS records. */
export function parseDnsZone(text: string): DnsRecord[] {
  const records: DnsRecord[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    const parts = line.includes(",") ? line.split(",").map((p) => p.trim()) : line.split(/\s+/);

    if (parts.length < 3) continue;

    let type: string;
    let name: string;
    let value: string;
    let ttl = 3600;

    if (parts.length >= 4 && RECORD_TYPES.has(parts[0]!.toUpperCase())) {
      [type, name, value] = [parts[0]!, parts[1]!, parts[2]!];
      ttl = Number(parts[3]) || 3600;
    } else if (parts.length >= 3 && RECORD_TYPES.has(parts[1]!.toUpperCase())) {
      [name, type, value] = [parts[0]!, parts[1]!, parts[2]!];
      if (parts[3]) ttl = Number(parts[3]) || 3600;
    } else if (parts.length >= 3) {
      [type, name, value] = [parts[0]!, parts[1]!, parts[2]!];
      if (parts[3]) ttl = Number(parts[3]) || 3600;
    } else {
      continue;
    }

    const normalizedType = type.toUpperCase();
    if (!RECORD_TYPES.has(normalizedType)) continue;

    records.push({
      type: normalizedType,
      name: name || "@",
      value,
      ttl,
    });
  }

  return records;
}
