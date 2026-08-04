/** Normalize phone to digits-only E.164 without leading +. */
export function normalizeWhatsappPhone(input: string): string {
  let digits = input.replace(/[^\d+]/g, "").trim();
  if (digits.startsWith("+")) digits = digits.slice(1);
  digits = digits.replace(/\D/g, "");

  // Local Azerbaijan mobile: 050... / 70... → 99450...
  if (digits.startsWith("0") && digits.length >= 10 && digits.length <= 11) {
    digits = `994${digits.slice(1)}`;
  }
  // Local Turkey mobile without country: 5xxxxxxxxx
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }

  return digits;
}

export function toWhatsappJid(phone: string): string {
  const digits = normalizeWhatsappPhone(phone);
  if (digits.length < 8) {
    throw new Error("INVALID_PHONE");
  }
  return `${digits}@s.whatsapp.net`;
}

export function phoneFromJid(jid: string | undefined | null): string | null {
  if (!jid) return null;
  const base = jid.split("@")[0] ?? "";
  const digits = base.replace(/\D/g, "");
  return digits || null;
}
