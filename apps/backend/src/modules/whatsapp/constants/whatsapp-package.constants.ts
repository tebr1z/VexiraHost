/** Known WhatsApp API package slugs → monthly message quota. */
export const WHATSAPP_PACKAGE_LIMITS: Record<string, number> = {
  "whatsapp-api-5000": 5000,
  "whatsapp-api-15000": 15000,
};

export function resolveWhatsappPackageLimit(productSlug: string): number | null {
  return WHATSAPP_PACKAGE_LIMITS[productSlug] ?? null;
}
