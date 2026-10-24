import { describe, expect, it } from "vitest";

import {
  estimateProject,
  PROJECT_PACKAGES,
  isProjectPackage,
  defaultProjectPricing,
  projectPackagePrice,
} from "./project-quote";

describe("project proposal estimate", () => {
  it("starts at the advertised price without charging for included benefits", () => {
    for (const [key, pack] of Object.entries(PROJECT_PACKAGES)) {
      expect(
        estimateProject({
          package: key as keyof typeof PROJECT_PACKAGES,
          pages: pack.pages,
          languages: 1,
          features: [],
        }).total,
      ).toBe(pack.price);
    }
  });
  it("does not charge twice for built-in features or duplicate selections", () => {
    expect(
      estimateProject({
        package: "store",
        pages: 8,
        languages: 1,
        features: ["cms", "payments", "account", "booking", "booking"],
      }).total,
    ).toBe(1699);
  });
  it("adds pages, languages and features as separately priced amounts", () => {
    expect(
      estimateProject({ package: "company", pages: 7, languages: 3, features: ["cms", "api"] }),
    ).toMatchObject({ total: 1319, extraPages: 70, extraLanguages: 200, extras: 250 });
  });
  it("clamps invalid counts and never reduces a package below its advertised price", () => {
    expect(
      estimateProject({ package: "company", pages: -1, languages: NaN, features: [] }),
    ).toMatchObject({ pages: 5, languages: 1, total: 799 });
    expect(
      estimateProject({ package: "landing", pages: 500, languages: 20, features: [] }),
    ).toMatchObject({ pages: 30, languages: 6 });
  });
  it("recognizes only actual packages from incoming links", () => {
    expect(isProjectPackage("mobile")).toBe(true);
    expect(isProjectPackage("constructor")).toBe(false);
    expect(isProjectPackage("__proto__")).toBe(false);
  });
  it("includes six months support on entry websites and twelve on stores and apps", () => {
    expect(PROJECT_PACKAGES.landing.supportMonths).toBe(6);
    expect(PROJECT_PACKAGES.company.supportMonths).toBe(6);
    expect(PROJECT_PACKAGES.store.supportMonths).toBe(12);
    expect(PROJECT_PACKAGES.mobile.supportMonths).toBe(12);
  });
});

describe("admin-managed project discounts", () => {
  it("applies a percentage to the package only, leaving extras at their saved rates", () => {
    const config = defaultProjectPricing();
    config.packages.company.discount = { type: "percent", value: 10 };
    expect(
      estimateProject({ package: "company", pages: 7, languages: 3, features: ["api"] }, config),
    ).toMatchObject({ base: 719.1, originalBase: 799, discountAmount: 79.9, total: 1239.1 });
  });
  it("uses a fixed reduction, custom feature prices and saved support periods", () => {
    const config = defaultProjectPricing();
    config.packages.company.discount = { type: "amount", value: 99 };
    config.features.api = 125;
    config.packages.company.supportMonths = 9;
    expect(
      estimateProject({ package: "company", pages: 5, languages: 1, features: ["api"] }, config),
    ).toMatchObject({ total: 825, supportMonths: 9 });
  });
  it("handles zero and full discounts in cents without negative or floating-point totals", () => {
    const config = defaultProjectPricing();
    const pack = config.packages.landing;
    pack.price = 0.3;
    pack.discount = { type: "percent", value: 10 };
    expect(projectPackagePrice(pack)).toBe(0.27);
    pack.discount.value = 100;
    config.extraPagePrice = 0.1;
    config.extraLanguagePrice = 0.2;
    expect(
      estimateProject({ package: "landing", pages: 2, languages: 2, features: [] }, config).total,
    ).toBe(0.3);
  });
});
