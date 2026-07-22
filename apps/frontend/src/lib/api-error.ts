/**
 * Extract a user-facing message from API client errors.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback: string,
  options?: { accountExists?: string },
): string {
  const mapKnown = (message: string): string => {
    const normalized = message.toLowerCase();
    if (
      options?.accountExists &&
      (normalized.includes("already exists") || normalized.includes("already registered"))
    ) {
      return options.accountExists;
    }
    return message;
  };

  if (err instanceof Error && err.message) {
    return mapKnown(err.message);
  }

  if (err && typeof err === "object" && "error" in err) {
    const message = (err as { error?: { message?: string | string[] } }).error?.message;
    if (typeof message === "string" && message.length > 0) {
      return mapKnown(message);
    }
    if (Array.isArray(message) && message.length > 0) {
      return mapKnown(message.join(", "));
    }
  }

  if (err instanceof TypeError) {
    return fallback;
  }

  return fallback;
}
