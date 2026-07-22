import type { ApiErrorResponse, ApiResponse } from "@vexira/types";

export function formatApiErrorMessage(payload: ApiErrorResponse): string {
  const message = payload.error?.message as string | string[] | undefined;
  if (typeof message === "string" && message.length > 0) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.join(", ");
  }
  return payload.error?.code ?? "Request failed";
}

export class ApiClientError extends Error {
  readonly payload: ApiErrorResponse;

  constructor(payload: ApiErrorResponse) {
    super(formatApiErrorMessage(payload));
    this.name = "ApiClientError";
    this.payload = payload;
  }
}

/**
 * SDK client configuration.
 */
export interface ApiClientConfig {
  baseUrl: string;
  accessToken?: string;
  refreshToken?: string;
  onUnauthorized?: () => void;
}

/**
 * HTTP methods supported by the SDK.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Request options for API calls.
 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Base API client — architecture only, no endpoint implementations.
 */
export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  setAccessToken(token: string): void {
    this.config.accessToken = token;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): URL {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}${normalizedPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url;
  }

  /**
   * Generic request handler scaffold.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path, options.params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.config.accessToken) {
      headers.Authorization = `Bearer ${this.config.accessToken}`;
    }

    let response: Response;

    try {
      response = await fetch(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (err) {
      throw new ApiClientError({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            err instanceof Error && err.message === "Failed to fetch"
              ? "Could not reach the API server. Check that the backend is running on port 4000."
              : err instanceof Error
                ? err.message
                : "Network request failed",
        },
        timestamp: new Date().toISOString(),
      });
    }

    let data: ApiResponse<T> | ApiErrorResponse;
    try {
      data = (await response.json()) as ApiResponse<T> | ApiErrorResponse;
    } catch {
      throw new ApiClientError({
        success: false,
        error: {
          code: "INVALID_RESPONSE",
          message: "The API returned an invalid response.",
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (response.status === 401 && this.config.onUnauthorized) {
      this.config.onUnauthorized();
    }

    if (!response.ok) {
      throw new ApiClientError(data as ApiErrorResponse);
    }

    return data as ApiResponse<T>;
  }
}
