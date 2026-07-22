import { randomUUID } from "node:crypto";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlugSuffix(): string {
  const token = randomUUID().replace(/-/g, "");
  return token.slice(0, Math.ceil(token.length / 2));
}

export async function resolveUniqueSlug(
  name: string,
  isTaken: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  const base = slugify(name) || "plan";
  if (!(await isTaken(base))) {
    return base;
  }

  let candidate = `${base}-${uniqueSlugSuffix()}`;
  while (await isTaken(candidate)) {
    candidate = `${base}-${uniqueSlugSuffix()}`;
  }
  return candidate;
}
