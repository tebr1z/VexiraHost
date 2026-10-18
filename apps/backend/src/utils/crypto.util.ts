import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getEncryptionKey(): Buffer {
  const configured = process.env.HOSTING_CREDENTIALS_KEY;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || configured.length < 32 || /change-me/i.test(configured))
  ) {
    throw new Error(
      "HOSTING_CREDENTIALS_KEY must be a unique secret of at least 32 characters in production",
    );
  }
  const secret = configured ?? "vexira-dev-hosting-key-change-me";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export type EncryptedSecretState = "missing" | "readable" | "unreadable";

/**
 * Checks whether a stored secret can be opened with the active encryption key
 * without exposing its plaintext to API callers or logs.
 */
export function inspectEncryptedSecret(payload?: string | null): EncryptedSecretState {
  if (!payload) return "missing";
  try {
    decryptSecret(payload);
    return "readable";
  } catch {
    return "unreadable";
  }
}

export function decryptCredential(payload: string, label: string): string {
  try {
    return decryptSecret(payload);
  } catch {
    throw new Error(
      `Stored ${label} credential cannot be decrypted. Re-enter it in the admin panel; the active HOSTING_CREDENTIALS_KEY does not match the value used when it was saved.`,
    );
  }
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(value.length - 2, 8))}${value.slice(-2)}`;
}
