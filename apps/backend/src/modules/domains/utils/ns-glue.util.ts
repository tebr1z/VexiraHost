export interface NsGlueEntry {
  host: string;
  ip: string;
}

export function parseNsGlueRecords(raw: unknown): NsGlueEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const host = typeof row.host === "string" ? row.host.trim().toLowerCase() : "";
      const ip = typeof row.ip === "string" ? row.ip.trim() : "";
      if (!host) return null;
      return { host, ip };
    })
    .filter((entry): entry is NsGlueEntry => entry !== null);
}

export function normalizeNsGlueEntries(
  entries: Array<{ host: string; ip?: string }>,
): NsGlueEntry[] {
  return entries
    .map((entry) => ({
      host: entry.host.trim().toLowerCase(),
      ip: (entry.ip ?? "").trim(),
    }))
    .filter((entry) => entry.host.length > 0);
}

export function nameserversFromGlue(
  entries: NsGlueEntry[],
  extraNameservers: string[] = [],
): string[] {
  const glueHosts = normalizeNsGlueEntries(entries).map((entry) => entry.host);
  const extras = extraNameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...glueHosts, ...extras])];
}
