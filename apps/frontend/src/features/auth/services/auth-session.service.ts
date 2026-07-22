import { refreshSessionRequest } from "./auth-refresh.service";
import { isAccessTokenExpired } from "../lib/auth-token.util";
import { useAuthStore } from "@/stores/auth-store";

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAuthSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken, rememberMe } = useAuthStore.getState();
    if (!refreshToken) return false;

    try {
      const session = await refreshSessionRequest(refreshToken);
      useAuthStore.getState().setSession(session, { rememberMe });
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function ensureValidAccessToken(): Promise<boolean> {
  const { accessToken, refreshToken, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !refreshToken) return false;
  if (accessToken && !isAccessTokenExpired(accessToken)) return true;
  return refreshAuthSession();
}
