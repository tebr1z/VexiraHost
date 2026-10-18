export function assertStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.length > 1_024 ||
    segments.some((segment) => !segment || segment === "." || segment === "..") ||
    normalized.includes("\0")
  ) {
    throw new Error("Invalid storage object key");
  }
  return normalized;
}
