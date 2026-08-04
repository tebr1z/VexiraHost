import { createWhatsappApiKey, hashWhatsappApiKey, looksLikeWhatsappApiKey } from "./api-key.util";

describe("WhatsApp API key utility", () => {
  it("creates a one-way hashed live key", () => {
    const key = createWhatsappApiKey();
    expect(key.rawKey).toMatch(/^vxwa_live_/);
    expect(key.keyHash).toBe(hashWhatsappApiKey(key.rawKey));
    expect(key.keyHash).not.toContain(key.rawKey);
    expect(key.lastFour).toBe(key.rawKey.slice(-4));
  });

  it("recognizes only the WhatsApp API key format", () => {
    expect(looksLikeWhatsappApiKey(createWhatsappApiKey().rawKey)).toBe(true);
    expect(looksLikeWhatsappApiKey("Bearer abc")).toBe(false);
  });
});
