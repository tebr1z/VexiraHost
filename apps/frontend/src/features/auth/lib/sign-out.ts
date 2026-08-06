import { logoutRequest } from "../services/auth.service";

import { useAuthStore } from "@/stores/auth-store";

const LOGOUT_TIMEOUT_MS = 2500;

/**
 * Ends the session and hard-navigates to the public home page.
 * Avoids /login (and the "Signing in…" stuck state when `next` points back to dashboard).
 */
export async function signOutToHome(): Promise<void> {
  const { refreshToken, clearSession } = useAuthStore.getState();

  try {
    if (refreshToken) {
      await Promise.race([
        logoutRequest(refreshToken).catch(() => undefined),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, LOGOUT_TIMEOUT_MS);
        }),
      ]);
    }
  } catch {
    // ignore network errors
  }

  clearSession();
  window.location.assign("/");
}
