const AUTH_NEXT_KEY = "vexira-auth-next";

/** Only same-origin relative paths (blocks open redirects). */
export function getSafeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // keep raw
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return null;
  }
  return value;
}

export function stashAuthNext(path: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = getSafeNextPath(path);
  if (safe) {
    sessionStorage.setItem(AUTH_NEXT_KEY, safe);
  }
}

export function peekAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  return getSafeNextPath(sessionStorage.getItem(AUTH_NEXT_KEY));
}

export function consumeAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const value = getSafeNextPath(sessionStorage.getItem(AUTH_NEXT_KEY));
  sessionStorage.removeItem(AUTH_NEXT_KEY);
  return value;
}

/** Prefer URL `next`, then stashed OAuth next, else dashboard. */
export function resolvePostAuthPath(urlNext?: string | null): string {
  return getSafeNextPath(urlNext) ?? peekAuthNext() ?? "/dashboard";
}

export function goAfterAuth(navigate: (href: string) => void, urlNext?: string | null): void {
  const path = getSafeNextPath(urlNext) ?? consumeAuthNext() ?? "/dashboard";
  navigate(path);
}
