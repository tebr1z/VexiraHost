const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function isValidIpv6(value: string): boolean {
  const ip = value.trim();
  if (!ip.includes(":")) return false;

  const zoneParts = ip.split("%");
  if (zoneParts.length > 2) return false;
  const address = zoneParts[0] ?? "";

  if (!/^[0-9a-fA-F:]+$/.test(address)) return false;
  if ((address.match(/::/g) ?? []).length > 1) return false;

  const hasIpv4Tail = address.includes(".");
  if (hasIpv4Tail) {
    const lastColon = address.lastIndexOf(":");
    const ipv4Part = address.slice(lastColon + 1);
    if (!IPV4_PATTERN.test(ipv4Part)) return false;
  }

  const expanded = address.includes("::")
    ? expandIpv6(address)
    : address.split(":").filter(Boolean);

  if (Array.isArray(expanded)) {
    if (expanded.length !== 8) return false;
    return expanded.every((group) => /^[0-9a-fA-F]{1,4}$/.test(group));
  }

  return false;
}

function expandIpv6(address: string): string[] | null {
  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":").filter(Boolean) : [];
  const tailGroups = tail ? tail.split(":").filter(Boolean) : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  if (missing < 0) return null;
  const groups = [...headGroups, ...Array(missing).fill("0"), ...tailGroups];
  if (groups.length !== 8) return null;
  return groups;
}

/** Returns true when value is empty or a valid IPv4/IPv6 address. */
export function isValidIpAddress(value: string): boolean {
  const ip = value.trim();
  if (!ip) return true;
  if (IPV4_PATTERN.test(ip)) return true;
  return isValidIpv6(ip);
}

export function findInvalidGlueIp(
  entries: Array<{ host: string; ip: string }>,
): { host: string; ip: string } | null {
  for (const entry of entries) {
    if (!isValidIpAddress(entry.ip)) {
      return entry;
    }
  }
  return null;
}
