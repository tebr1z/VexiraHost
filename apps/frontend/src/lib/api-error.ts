import { ApiClientError } from "@vexira/api-sdk";

/**
 * Extract a user-facing message from API client errors.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback: string,
  options?: { accountExists?: string; turnstileFailed?: string; domainTaken?: string },
): string {
  if (options?.turnstileFailed && isTurnstileRejected(err)) {
    return options.turnstileFailed;
  }

  const mapKnown = (message: string): string => {
    const normalized = message.toLowerCase();
    if (
      options?.accountExists &&
      (normalized.includes("already exists") || normalized.includes("already registered"))
    ) {
      return options.accountExists;
    }
    if (
      options?.domainTaken &&
      (normalized.includes("already in use by another account") ||
        normalized.includes("already assigned to another customer"))
    ) {
      return options.domainTaken;
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

export function isTurnstileRejected(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    return err.payload.error?.code === "FORBIDDEN";
  }
  if (err && typeof err === "object" && "error" in err) {
    return (err as { error?: { code?: string } }).error?.code === "FORBIDDEN";
  }
  return false;
}

export function isAuthChallengeError(err: unknown): boolean {
  const code =
    err instanceof ApiClientError
      ? err.payload.error?.code
      : err && typeof err === "object" && "error" in err
        ? (err as { error?: { code?: string } }).error?.code
        : undefined;
  return code === "UNAUTHORIZED" || code === "FORBIDDEN";
}
