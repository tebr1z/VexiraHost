import { isStaffRole } from "@/lib/is-staff-role";

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

export function isAdminAreaPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path === "/t4abriz" || path.startsWith("/t4abriz/");
}

export function stashAuthNext(path: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const safe = getSafeNextPath(path);
  // Never stash staff-only paths for anonymous redirects — that leaks the surface.
  if (safe && !isAdminAreaPath(safe)) {
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

function resolveDestination(path: string, role?: string | null): string {
  // Staff may land on the staff area after login. Everyone else never follows that next.
  if (isAdminAreaPath(path) && !isStaffRole(role)) {
    return "/dashboard";
  }
  return path;
}

/** Prefer URL `next`, then stashed OAuth next, else dashboard. */
export function resolvePostAuthPath(urlNext?: string | null, role?: string | null): string {
  const path = getSafeNextPath(urlNext) ?? peekAuthNext() ?? "/dashboard";
  return resolveDestination(path, role);
}

export function goAfterAuth(
  navigate: (href: string) => void,
  urlNext?: string | null,
  role?: string | null,
): void {
  const path = getSafeNextPath(urlNext) ?? consumeAuthNext() ?? "/dashboard";
  navigate(resolveDestination(path, role));
}
