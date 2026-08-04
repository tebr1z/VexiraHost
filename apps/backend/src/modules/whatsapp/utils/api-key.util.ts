import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "vxwa_live_";

export function hashWhatsappApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function createWhatsappApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
  lastFour: string;
} {
  const rawKey = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    rawKey,
    keyHash: hashWhatsappApiKey(rawKey),
    keyPrefix: rawKey.slice(0, KEY_PREFIX.length + 8),
    lastFour: rawKey.slice(-4),
  };
}

export function looksLikeWhatsappApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length >= KEY_PREFIX.length + 32;
}
