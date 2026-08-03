import { isIP } from "node:net";

/** Returns true when value is empty or a valid IPv4/IPv6 address. */
export function isValidIpAddress(value: string): boolean {
  const ip = value.trim();
  if (!ip) return true;
  return isIP(ip) !== 0;
}

export function assertValidGlueIps(entries: Array<{ host: string; ip: string }>): void {
  for (const entry of entries) {
    if (!isValidIpAddress(entry.ip)) {
      throw new Error(`INVALID_IP:${entry.host}`);
    }
  }
}
