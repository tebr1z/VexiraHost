export function generateSecret(): string {
  return "TESTTOTPSECRET";
}

export function generateSync(): string {
  return "123456";
}

export function generateURI(input: { issuer: string; label: string; secret: string }): string {
  return `otpauth://totp/${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.label)}?secret=${encodeURIComponent(input.secret)}`;
}

export function verifySync(input: { token: string }): { valid: boolean } {
  return { valid: input.token === "123456" };
}
