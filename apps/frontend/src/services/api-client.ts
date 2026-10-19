import { ApiClient, ApiClientError } from "@vexira/api-sdk";
import type { RequestOptions } from "@vexira/api-sdk";
import type { ApiResponse } from "@vexira/types";

import { refreshAuthSession } from "@/features/auth/services/auth-session.service";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const innerClient = new ApiClient({ baseUrl: API_BASE_URL });

function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiClientError && err.payload.error?.code === "UNAUTHORIZED";
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

  try {
    return await innerClient.request<T>(path, options);
  } catch (err) {
    if (allowRefresh && !isRefreshRoute && isUnauthorizedError(err)) {
      const refreshed = await refreshAuthSession();
      if (!refreshed) {
        handleUnauthorized();
        throw err;
      }
      try {
        return await innerClient.request<T>(path, options);
      } catch (retryErr) {
        if (isUnauthorizedError(retryErr)) handleUnauthorized();
        throw retryErr;
      }
    }

    if (isUnauthorizedError(err)) handleUnauthorized();
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
