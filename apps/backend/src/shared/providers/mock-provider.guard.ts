import { ServiceUnavailableException } from "@nestjs/common";

/**
 * Mock providers are useful locally, but must never complete a customer action
 * in production. Keep this check inside the provider so a misconfigured caller
 * cannot accidentally bypass it.
 */
export function assertMockProviderAllowed(provider: string): void {
  if ((process.env.NODE_ENV ?? "development").trim().toLowerCase() !== "production") {
    return;
  }

  throw new ServiceUnavailableException(
    `${provider} is not configured for production. Contact support before retrying.`,
  );
}
