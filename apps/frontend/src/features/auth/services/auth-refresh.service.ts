import type { AuthSession } from "@vexira/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function refreshSessionRequest(refreshToken: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const body = (await response.json()) as {
    success?: boolean;
    data?: AuthSession;
    error?: { message?: string };
  };

  if (!response.ok || !body.data) {
    throw new Error(body.error?.message ?? "Session refresh failed");
  }

  return body.data;
}
