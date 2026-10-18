import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  )
    return true;
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isPublicManagedServerAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase();
  const family = isIP(normalized);
  if (family === 4) return !isPrivateIpv4(normalized);
  if (family !== 6) return false;
  if (normalized.startsWith("::ffff:")) return isPublicManagedServerAddress(normalized.slice(7));
  return !(
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

export async function assertPublicManagedServerHost(host: string): Promise<string> {
  const normalized = host.trim().toLowerCase();
  if (
    ["localhost", "localhost.localdomain"].includes(normalized) ||
    normalized.endsWith(".local")
  ) {
    throw new Error("Local and private network hosts are not allowed");
  }
  const directFamily = isIP(normalized);
  const addresses = directFamily
    ? [normalized]
    : (await lookup(normalized, { all: true, verbatim: true })).map((entry) => entry.address);
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isPublicManagedServerAddress(address))
  ) {
    throw new Error("The SSH host must resolve only to public internet addresses");
  }
  return addresses[0];
}
