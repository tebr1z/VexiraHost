"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { AuthField } from "@/features/auth/components/auth-field";
import { goAfterAuth } from "@/features/auth/lib/auth-redirect";
import {
  resendLoginOtpRequest,
  verifyLoginOtpRequest,
  type LoginTwoFactorChallenge,
} from "@/features/auth/services/auth.service";
import { saveLastGoogleAccount } from "@/lib/last-google-account";
import { apiClient } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";

function readCallbackSearchParams(fallback: URLSearchParams): URLSearchParams {
  // Prefer the real browser URL — useSearchParams can be empty on first paint.
  if (typeof window !== "undefined") {
    const fromWindow = new URLSearchParams(window.location.search);
    if (
      fromWindow.get("requiresTwoFactor") ||
      fromWindow.get("accessToken") ||
      fromWindow.get("challengeId")
    ) {
      return fromWindow;
    }
  }
  return fallback;
}

function parseOAuthChallenge(params: URLSearchParams): LoginTwoFactorChallenge | null {
  const flag = params.get("requiresTwoFactor");
  if (flag !== "1" && flag !== "true") return null;
  const challengeId = params.get("challengeId");
  const methodRaw = params.get("method");
  const emailHint = params.get("emailHint");
  const expiresInRaw = params.get("expiresIn");
  if (!challengeId || !emailHint) return null;
  const method = methodRaw === "TOTP" || methodRaw === "EMAIL" ? methodRaw : "EMAIL";
  const expiresIn = Number(expiresInRaw);
  return {
    requiresTwoFactor: true,
    method,
    challengeId,
    emailHint,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 600,
  };
}

function OAuthCallbackHandler(): React.ReactElement {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<LoginTwoFactorChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpResending, setOtpResending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const search = readCallbackSearchParams(params);
    const oauthChallenge = parseOAuthChallenge(search);
    if (oauthChallenge) {
      setChallenge(oauthChallenge);
      setBootstrapped(true);
      return;
    }

    const accessToken = search.get("accessToken");
    const refreshToken = search.get("refreshToken");
    const provider = search.get("provider");

    if (!accessToken || !refreshToken) {
      setError("OAuth login failed. Missing tokens.");
      setBootstrapped(true);
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
        goAfterAuth((href) => router.replace(href), null, user?.role);
      })
      .catch(() => setError("OAuth login failed. Please try again."))
      .finally(() => setBootstrapped(true));
  }, [params, router, setSession]);

  const onVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    try {
      setError(null);
      setOtpSubmitting(true);
      const session = await verifyLoginOtpRequest({
        challengeId: challenge.challengeId,
        code: otpCode.trim(),
        locale,
      });
      if (params.get("provider") === "google" && session.user?.email) {
        const fullName = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ");
        saveLastGoogleAccount({
          email: session.user.email,
          name: fullName || undefined,
        });
      }
      setSession(session, { rememberMe: true });
      goAfterAuth((href) => router.replace(href), null, session.user?.role);
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("otpInvalid");
      setError(message ?? t("otpInvalid"));
    } finally {
      setOtpSubmitting(false);
    }
  };

  const onResendOtp = async () => {
    if (!challenge) return;
    try {
      setError(null);
      setOtpResending(true);
      const next = await resendLoginOtpRequest({
        challengeId: challenge.challengeId,
        locale,
      });
      setChallenge(next);
      setOtpCode("");
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : t("otpResendFailed");
      setError(message ?? t("otpResendFailed"));
    } finally {
      setOtpResending(false);
    }
  };

  if (challenge) {
    const isTotp = challenge.method === "TOTP";
    return (
      <div className="card-3d w-full max-w-md rounded-3xl p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="font-jakarta text-primary sm:text-headline-lg text-3xl font-bold">
            {isTotp ? t("totpLoginTitle") : t("otpTitle")}
          </h1>
          <p className="text-on-surface-variant sm:text-body-md mt-2 text-sm">
            {isTotp ? t("totpLoginSubtitle") : t("otpSubtitle", { email: challenge.emailHint })}
          </p>
        </div>

        <form onSubmit={onVerifyOtp} className="space-y-3.5">
          <AuthField
            name="otpCode"
            label={isTotp ? t("totpLoginCode") : t("otpCode")}
            icon="pin"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
          />

          {error ? (
            <div className="border-error/20 bg-error-container text-error rounded-xl border px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={otpSubmitting || otpCode.trim().length !== 6}
            className="bg-primary text-on-primary mt-1 h-12 w-full rounded-2xl font-semibold transition hover:opacity-90 disabled:opacity-60"
          >
            {otpSubmitting ? t("otpVerifying") : t("otpVerify")}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          {!isTotp ? (
            <button
              type="button"
              onClick={() => void onResendOtp()}
              disabled={otpResending}
              className="text-secondary font-semibold hover:underline disabled:opacity-60"
            >
              {otpResending ? t("otpResending") : t("otpResend")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-on-surface-variant hover:underline"
          >
            {t("otpBack")}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-error">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-secondary mt-4 hover:underline"
        >
          Back to login
        </button>
      </div>
    );
  }

  if (!bootstrapped) {
    return <p className="text-on-surface-variant">{t("signingIn")}</p>;
  }

  return <p className="text-on-surface-variant">{t("signingIn")}</p>;
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
