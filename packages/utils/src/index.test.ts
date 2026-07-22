import { describe, expect, it } from "vitest";

import { resolveUniqueSlug, slugify, uniqueSlugSuffix } from "./index.js";

describe("slugify", () => {
  it("converts strings to URL-safe slugs", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
});

describe("resolveUniqueSlug", () => {
  it("returns base slug when available", async () => {
    await expect(resolveUniqueSlug("Web Starter", async () => false)).resolves.toBe("web-starter");
  });

  it("appends suffix when base slug is taken", async () => {
    const taken = new Set(["web-starter"]);
    const slug = await resolveUniqueSlug("Web Starter", async (candidate) => taken.has(candidate));
    expect(slug.startsWith("web-starter-")).toBe(true);
    expect(slug.length).toBeGreaterThan("web-starter".length);
  });

  it("uses half-length suffix tokens", () => {
    expect(uniqueSlugSuffix().length).toBe(16);
  });
});