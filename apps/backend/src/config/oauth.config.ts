import { registerAs } from "@nestjs/config";

export const oauthConfig = registerAs("oauth", () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      "http://localhost:4000/api/v1/auth/google/callback",
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ??
      "http://localhost:4000/api/v1/auth/github/callback",
  },
  frontendCallbackUrl:
    process.env.FRONTEND_AUTH_CALLBACK_URL ?? "http://localhost:3000/auth/callback",
}));

export type OauthConfig = ReturnType<typeof oauthConfig>;
