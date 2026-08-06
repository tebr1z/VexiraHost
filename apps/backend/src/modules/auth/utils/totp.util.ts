import { generateSecret, generateSync, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Vexira Host";

export function createTotpSecret(): string {
  return generateSecret();
}

export function buildTotpUri(email: string, secret: string): string {
  return generateURI({
    issuer: ISSUER,
    label: email,
    secret,
  });
}

export async function buildTotpQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 240,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const cleaned = token.replace(/\s/g, "").trim();
  if (!/^\d{6}$/.test(cleaned)) return false;
  const result = verifySync({ secret, token: cleaned });
  return Boolean(result?.valid);
}

/** Current period code (debug only). */
export function currentTotpCode(secret: string): string {
  return generateSync({ secret });
}
