import { assertNoProfanity, containsProfanity } from "./profanity-filter.util";

describe("profanity-filter", () => {
  it("allows clean messages", () => {
    expect(containsProfanity("Hello, your order is ready")).toBe(false);
    expect(containsProfanity("Salam, sifarişiniz hazırdır")).toBe(false);
  });

  it("blocks known profanity", () => {
    expect(containsProfanity("what the fuck")).toBe(true);
    expect(containsProfanity("siktir get")).toBe(true);
  });

  it("throws on assert", () => {
    expect(() => assertNoProfanity("clean")).not.toThrow();
    expect(() => assertNoProfanity("fuck you")).toThrow();
  });
});
