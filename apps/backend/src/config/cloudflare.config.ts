import { registerAs } from "@nestjs/config";

export const cloudflareConfig = registerAs("cloudflare", () => ({
  apiToken: process.env.CLOUDFLARE_API_TOKEN ?? "",
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  apiBaseUrl: process.env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4",
}));

export type CloudflareConfig = ReturnType<typeof cloudflareConfig>;
