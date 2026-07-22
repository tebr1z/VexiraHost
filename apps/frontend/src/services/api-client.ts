import { ApiClient, ApiClientError } from "@vexira/api-sdk";
import type { ApiResponse } from "@vexira/types";
import type { RequestOptions } from "@vexira/api-sdk";

import { refreshAuthSession } from "@/features/auth/services/auth-session.service";
import { useAuthStore } from "@/stores/auth-store";
import { useMaintenanceStore } from "@/stores/maintenance-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const innerClient = new ApiClient({ baseUrl: API_BASE_URL });

const IGNORE_UNAVAILABLE_PATHS = ["/health", "/auth/refresh"];

function shouldIgnorePath(path: string): boolean {
  return IGNORE_UNAVAILABLE_PATHS.some((p) => path === p || path.endsWith(p));
}

function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiClientError && err.payload.error?.code === "UNAUTHORIZED";
}

/** Network / gateway / server failures → show maintenance-style overlay immediately. */
function isBackendUnavailableError(err: unknown): boolean {
  if (!(err instanceof ApiClientError)) return true;

  const code = (err.payload.error?.code ?? "").toUpperCase();

  if (
    code === "NETWORK_ERROR" ||
    code === "INVALID_RESPONSE" ||
    code === "TIMEOUT" ||
    code === "REQUEST_TIMEOUT" ||
    code === "SERVICE_UNAVAILABLE" ||
    code === "INTERNAL_ERROR" ||
    code === "INTERNAL_SERVER_ERROR" ||
    code === "BAD_GATEWAY" ||
    code === "GATEWAY_TIMEOUT"
  ) {
    return true;
  }

  if (/\b(500|502|503|504)\b/.test(code)) return true;

  return false;
}

function markApiOk(): void {
  if (typeof window === "undefined") return;
  useMaintenanceStore.getState().setApiUnavailable(false);
}

function markApiUnavailable(): void {
  if (typeof window === "undefined") return;
  useMaintenanceStore.getState().setApiUnavailable(true);
}

function handleUnauthorized(): void {
  if (typeof window === "undefined") return;

  useAuthStore.getState().clearSession();

  const currentPath = window.location.pathname;
  if (currentPath.includes("/login")) return;

  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?next=${next}`);
}

async function requestWithAuth<T>(
  path: string,
  options: RequestOptions = {},
  allowRefresh = true,
): Promise<ApiResponse<T>> {
  const isRefreshRoute = path === "/auth/refresh" || path.endsWith("/auth/refresh");
  const trackAvailability = !shouldIgnorePath(path);

  try {
    const result = await innerClient.request<T>(path, options);
    if (trackAvailability) markApiOk();
    return result;
  } catch (err) {
    if (allowRefresh && !isRefreshRoute && isUnauthorizedError(err)) {
      const refreshed = await refreshAuthSession();
      if (!refreshed) {
        handleUnauthorized();
        throw err;
      }
      try {
        const result = await innerClient.request<T>(path, options);
        if (trackAvailability) markApiOk();
        return result;
      } catch (retryErr) {
        if (isUnauthorizedError(retryErr)) handleUnauthorized();
        else if (trackAvailability && isBackendUnavailableError(retryErr)) markApiUnavailable();
        throw retryErr;
      }
    }

    if (isUnauthorizedError(err)) handleUnauthorized();
    else if (trackAvailability && isBackendUnavailableError(err)) markApiUnavailable();
    throw err;
  }
}

export const apiClient = {
  setAccessToken(token: string): void {
    innerClient.setAccessToken(token);
  },
  getBaseUrl(): string {
    return innerClient.getBaseUrl();
  },
  request<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return requestWithAuth<T>(path, options);
  },
};
