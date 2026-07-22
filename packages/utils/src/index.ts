/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Short unique suffix (half of a random token) for duplicate slugs.
 */
export function uniqueSlugSuffix(): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  return token.slice(0, Math.ceil(token.length / 2));
}

/**
 * Build an SEO slug from a name; append a unique suffix when taken.
 */
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

/**
 * Omit specified keys from an object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Pick specified keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}
