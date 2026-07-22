/** Returns JWT expiry in ms, or null if the token cannot be parsed. */
export function getAccessTokenExpiryMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string | null | undefined, skewMs = 30_000): boolean {
  if (!token) return true;
  const exp = getAccessTokenExpiryMs(token);
  if (!exp) return true;
  return Date.now() >= exp - skewMs;
}
