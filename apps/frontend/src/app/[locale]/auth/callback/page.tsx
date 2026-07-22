"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { apiClient } from "@/services/api-client";
import { saveLastGoogleAccount } from "@/lib/last-google-account";
import { useAuthStore } from "@/stores/auth-store";

function OAuthCallbackHandler(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const provider = params.get("provider");

    if (!accessToken || !refreshToken) {
      setError("OAuth login failed. Missing tokens.");
      return;
    }

    apiClient.setAccessToken(accessToken);

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        const body = await res.json();
        const user = body.data;
        if (provider === "google" && user?.email) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
          saveLastGoogleAccount({
            email: user.email,
            name: fullName || undefined,
          });
        }
        setSession(
          {
            user,
            tokens: { accessToken, refreshToken, expiresIn: "15m" },
          },
          { rememberMe: true },
        );
        router.replace("/dashboard");
      })
      .catch(() => setError("OAuth login failed. Please try again."));
  }, [params, router, setSession]);

  if (error) {
    return (
      <div className="text-center">
        <p className="text-error">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-4 text-secondary hover:underline"
        >
          Back to login
        </button>
      </div>
    );
  }

  return <p className="text-on-surface-variant">Completing sign in...</p>;
}

export default function AuthCallbackPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p className="text-on-surface-variant">Loading...</p>}>
        <OAuthCallbackHandler />
      </Suspense>
    </div>
  );
}
