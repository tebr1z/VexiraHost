import { randomBytes } from "node:crypto";

/** ASCII letters and digits only — no quotes, spaces, or national characters. */
const PLESK_PASSWORD_CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Plesk requires passwords without quotes/spaces/national chars,
 * length 5–255, and must not contain the login name.
 */
export function generatePleskCompliantPassword(username: string, length = 16): string {
  const login = username.toLowerCase();
  const size = Math.max(12, Math.min(length, 64));

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const bytes = randomBytes(size);
    let password = "";

    for (let i = 0; i < size; i += 1) {
      password += PLESK_PASSWORD_CHARS[bytes[i]! % PLESK_PASSWORD_CHARS.length];
    }

    if (!/[a-z]/.test(password)) {
      password = `a${password.slice(1)}`;
    }
    if (!/[A-Z]/.test(password)) {
      password = `${password.slice(0, -1)}Z`;
    }
    if (!/[0-9]/.test(password)) {
      password = `${password.slice(0, -2)}9${password.slice(-1)}`;
    }

    if (!password.toLowerCase().includes(login)) {
      return password;
    }
  }

  return randomBytes(16).toString("hex");
}
