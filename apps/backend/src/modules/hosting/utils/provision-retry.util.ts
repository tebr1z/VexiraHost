export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  error: Error;
  nextDelayMs: number;
}

const TRANSIENT_PATTERNS = [
  /timed? ?out/i,
  /timeout/i,
  /connection reset/i,
  /econnreset/i,
  /econnrefused/i,
  /socket hang up/i,
  /temporar/i,
  /rate limit/i,
  /too many requests/i,
  /http 5\d\d/i,
  /bad gateway/i,
  /service unavailable/i,
  /gateway timeout/i,
];

export function isTransientProvisionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_PATTERNS.some((pattern) => pattern.test(message));
}

export async function withProvisionRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (context: RetryContext) => Promise<void> | void;
    sleep?: (delayMs: number) => Promise<void>;
  } = {},
): Promise<{ value: T; attempts: number }> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 2_000);
  const shouldRetry = options.shouldRetry ?? isTransientProvisionError;
  const sleep =
    options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return { value: await operation(), attempts: attempt };
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
      const nextDelayMs = baseDelayMs * 2 ** (attempt - 1);
      await options.onRetry?.({
        attempt,
        maxAttempts,
        error: error instanceof Error ? error : new Error(String(error)),
        nextDelayMs,
      });
      await sleep(nextDelayMs);
    }
  }
  throw new Error("Provision retry loop ended unexpectedly");
}
