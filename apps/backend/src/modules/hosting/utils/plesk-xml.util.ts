export function extractXmlError(body: string): string | null {
  const statusMatch = body.match(/<status>error<\/status>[\s\S]*?<errtext>([^<]+)<\/errtext>/i);
  if (statusMatch?.[1]) return statusMatch[1].trim();

  const faultMatch = body.match(/<faultstring>([^<]+)<\/faultstring>/i);
  if (faultMatch?.[1]) return faultMatch[1].trim();

  return null;
}

export function extractXmlId(body: string): string | null {
  const match = body.match(/<id>([^<]+)<\/id>/i);
  return match?.[1]?.trim() ?? null;
}

export function extractXmlTag(body: string, tag: string): string | null {
  const match = body.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

export function extractXmlTags(body: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    if (match[1]) values.push(match[1].trim());
  }
  return values;
}

export function extractXmlBlock(body: string, tag: string): string | null {
  const match = body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ?? null;
}

export function parseXmlInt(value: string | null | undefined): number | null {
  if (value == null || value === "" || value === "-1") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePleskStatus(value: string | null): "active" | "suspended" | "unknown" {
  if (value === "0") return "active";
  if (value === "16" || value === "32") return "suspended";
  return "unknown";
}

export function parseDiskUsageBlock(block: string | null): Record<string, number> {
  if (!block) return {};
  const usage: Record<string, number> = {};
  const tagRegex = /<([a-z_]+)>(\d+)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(block)) !== null) {
    usage[match[1]] = Number.parseInt(match[2], 10);
  }
  return usage;
}

export function sumDiskUsage(usage: Record<string, number>): number {
  return Object.values(usage).reduce((sum, n) => sum + n, 0);
}

export function extractWebspaceResultBlock(body: string): string | null {
  const getBlock = extractXmlBlock(body, "get");
  if (!getBlock) return null;
  return extractXmlBlock(getBlock, "result");
}

export function extractHostingProperty(block: string | null, name: string): string | null {
  if (!block) return null;
  const propertyBlocks = block.match(/<property>[\s\S]*?<\/property>/gi) ?? [];
  for (const property of propertyBlocks) {
    const propName = extractXmlTag(property, "name");
    if (propName === name) {
      return extractXmlTag(property, "value");
    }
  }
  return null;
}
