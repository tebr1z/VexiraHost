import type { UserRole } from "@vexira/types";

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  emailVerified: boolean;
  status: string;
  preferredCurrency?: string | null;
  billingPeriod?: string | null;
  currencyLocked?: boolean;
  currencyChangedAt?: string | null;
  canChangeCurrency?: boolean;
  nextCurrencyChangeAt?: string | null;
  billingAddress?: {
    fullName: string;
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  } | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: AuthUserResponse;
  tokens: AuthTokensResponse;
}
