import type { AuthSession } from "@vexira/types";

import type { LoginFormValues, RegisterFormValues } from "../schemas/auth.schema";

import { apiClient } from "@/services/api-client";

export async function loginRequest(values: LoginFormValues, locale?: string): Promise<AuthSession> {
  const response = await apiClient.request<AuthSession>("/auth/login", {
    method: "POST",
    body: { ...values, locale },
  });
  return response.data as AuthSession;
}

export async function registerRequest(
  values: RegisterFormValues,
  locale?: string,
  countryCode?: string | null,
): Promise<AuthSession> {
  const { confirmPassword: _, acceptedTerms: __, ...payload } = values;
  const response = await apiClient.request<AuthSession>("/auth/register", {
    method: "POST",
    body: {
      ...payload,
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
