import type { AuthSession } from "@vexira/types";

import type { LoginFormValues, RegisterFormValues } from "../schemas/auth.schema";

import { apiClient } from "@/services/api-client";

export type LoginTwoFactorChallenge = {
  requiresTwoFactor: true;
  method?: "EMAIL" | "TOTP";
  challengeId: string;
  expiresIn: number;
  emailHint: string;
};

export type LoginResult = AuthSession | LoginTwoFactorChallenge;

export function isLoginTwoFactorChallenge(value: unknown): value is LoginTwoFactorChallenge {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const flagged =
    record.requiresTwoFactor === true ||
    record.requiresTwoFactor === "true" ||
    record.requiresTwoFactor === 1;
  return (
    flagged &&
    typeof record.challengeId === "string" &&
    record.challengeId.length > 0 &&
    !("tokens" in record)
  );
}

export async function loginRequest(values: LoginFormValues, locale?: string): Promise<LoginResult> {
  const response = await apiClient.request<LoginResult>("/auth/login", {
    method: "POST",
    body: { ...values, locale },
  });
  return response.data as LoginResult;
}

export async function verifyLoginOtpRequest(input: {
  challengeId: string;
  code: string;
  locale?: string;
}): Promise<AuthSession> {
  const response = await apiClient.request<AuthSession>("/auth/login/verify-otp", {
    method: "POST",
    body: input,
  });
  return response.data as AuthSession;
}

export async function resendLoginOtpRequest(input: {
  challengeId: string;
  locale?: string;
}): Promise<LoginTwoFactorChallenge> {
  const response = await apiClient.request<LoginTwoFactorChallenge>("/auth/login/resend-otp", {
    method: "POST",
    body: input,
  });
  return response.data as LoginTwoFactorChallenge;
}

export async function registerRequest(
  values: RegisterFormValues & { phone?: string | null },
  locale?: string,
  countryCode?: string | null,
): Promise<AuthSession> {
  const {
    confirmPassword: _,
    acceptedTerms: __,
    phoneDialIso2: ___,
    phoneNational: ____,
    phone,
    ...payload
  } = values;
  const response = await apiClient.request<AuthSession>("/auth/register", {
    method: "POST",
    body: {
      ...payload,
      phone: phone || undefined,
      marketingOptIn: values.marketingOptIn ?? true,
      locale,
      countryCode: countryCode ?? undefined,
    },
  });
  return response.data as AuthSession;
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await apiClient.request("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export async function fetchProfile(): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me");
  return response.data as AuthSession["user"];
}

export async function recordPreferredLocale(locale: string): Promise<void> {
  try {
    await apiClient.request("/auth/locale", {
      method: "PATCH",
      body: { locale },
    });
  } catch {
    // Never block UI language switching on locale sync failures.
  }
}

export async function updateUserPreferences(input: {
  preferredCurrency?: string;
  billingPeriod?: string;
  countryCode?: string | null;
}): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/preferences", {
    method: "PATCH",
    body: input,
  });
  return response.data as AuthSession["user"];
}

export async function updateBillingAddress(input: {
  fullName: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/billing-address", {
    method: "PATCH",
    body: { billingAddress: input },
  });
  return response.data as AuthSession["user"];
}

export async function updatePhone(input: {
  phone: string | null;
  whatsappNotificationsEnabled: boolean;
}): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/phone", {
    method: "PATCH",
    body: input,
  });
  return response.data as AuthSession["user"];
}

export async function updateEmailTwoFactor(enabled: boolean): Promise<
  | AuthSession["user"]
  | {
      requiresVerification: true;
      challengeId: string;
      expiresIn: number;
      emailHint: string;
      desiredEnabled: boolean;
    }
> {
  const response = await apiClient.request<
    | AuthSession["user"]
    | {
        requiresVerification: true;
        challengeId: string;
        expiresIn: number;
        emailHint: string;
        desiredEnabled: boolean;
      }
    | { alreadyApplied: true; profile: AuthSession["user"] }
  >("/users/me/security/email-2fa", {
    method: "PATCH",
    body: { enabled },
  });
  const data = response.data as
    | AuthSession["user"]
    | {
        requiresVerification: true;
        challengeId: string;
        expiresIn: number;
        emailHint: string;
        desiredEnabled: boolean;
      }
    | { alreadyApplied: true; profile: AuthSession["user"] };

  if (data && typeof data === "object" && "alreadyApplied" in data && data.alreadyApplied) {
    return data.profile;
  }
  return data as
    | AuthSession["user"]
    | {
        requiresVerification: true;
        challengeId: string;
        expiresIn: number;
        emailHint: string;
        desiredEnabled: boolean;
      };
}

export async function verifyEmailTwoFactor(input: {
  challengeId: string;
  code: string;
}): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>(
    "/users/me/security/email-2fa/verify",
    {
      method: "POST",
      body: input,
    },
  );
  return response.data as AuthSession["user"];
}

export type TotpSetupResponse = {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
  issuer: string;
};

export async function setupTotpRequest(): Promise<TotpSetupResponse> {
  const response = await apiClient.request<TotpSetupResponse>("/users/me/security/totp/setup", {
    method: "POST",
  });
  return response.data as TotpSetupResponse;
}

export async function confirmTotpRequest(code: string): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/security/totp/confirm", {
    method: "POST",
    body: { code },
  });
  return response.data as AuthSession["user"];
}

export async function disableTotpRequest(code: string): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/security/totp/disable", {
    method: "POST",
    body: { code },
  });
  return response.data as AuthSession["user"];
}

export async function cancelTotpSetupRequest(): Promise<AuthSession["user"]> {
  const response = await apiClient.request<AuthSession["user"]>("/users/me/security/totp/cancel", {
    method: "POST",
  });
  return response.data as AuthSession["user"];
}

export async function resendVerificationRequest(): Promise<void> {
  await apiClient.request("/auth/resend-verification", {
    method: "POST",
  });
}

export async function verifyEmailTokenRequest(token: string): Promise<AuthSession> {
  const response = await apiClient.request<AuthSession>("/auth/verify-email", {
    method: "POST",
    body: { token },
  });
  return response.data as AuthSession;
}

export async function forgotPasswordRequest(email: string): Promise<void> {
  await apiClient.request("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPasswordRequest(input: {
  token: string;
  password: string;
}): Promise<void> {
  await apiClient.request("/auth/reset-password", {
    method: "POST",
    body: {
      token: input.token,
      password: input.password,
    },
  });
}
