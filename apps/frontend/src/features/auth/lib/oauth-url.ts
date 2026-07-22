const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function buildOAuthUrl(
  provider: "google" | "github",
  options?: { loginHint?: string; locale?: string },
): string {
  const url = new URL(`${API_BASE}/auth/${provider}`);
  if (provider === "google" && options?.loginHint) {
    url.searchParams.set("login_hint", options.loginHint);
  }
  if (provider === "google" && options?.locale) {
    url.searchParams.set("locale", options.locale);
  }
  return url.toString();
}
