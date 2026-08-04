import { normalizeWhatsappPhone, toWhatsappJid } from "./phone.util";

describe("whatsapp phone util", () => {
  it("strips plus and non-digits", () => {
    expect(normalizeWhatsappPhone("+994 50 123 45 67")).toBe("994501234567");
  });

  it("normalizes AZ local numbers", () => {
    expect(normalizeWhatsappPhone("0501234567")).toBe("994501234567");
  });

  it("normalizes TR 10-digit mobiles", () => {
    expect(normalizeWhatsappPhone("5321234567")).toBe("905321234567");
  });

  it("builds jid", () => {
    expect(toWhatsappJid("+994501234567")).toBe("994501234567@s.whatsapp.net");
  });
});
