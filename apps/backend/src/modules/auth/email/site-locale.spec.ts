import { mergeLocaleHistory, resolveAuthEmailLocale, resolveSiteLocale } from "./auth-email.locale";
describe("new site languages", () => {
  it("retains German and Spanish UI preferences without changing email template fallbacks", () => {
    expect(mergeLocaleHistory(["tr", "en"], "de-DE")).toEqual(["de", "tr", "en"]);
    expect(mergeLocaleHistory(["de", "en"], "es")).toEqual(["es", "de", "en"]);
    expect(resolveSiteLocale("es-ES")).toBe("es");
    expect(resolveAuthEmailLocale("de")).toBe("en");
  });
});
